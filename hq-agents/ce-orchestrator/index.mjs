// ============================================================
// HQ KRAEFEGG M.O. - Orquestrador da Equipe de Agentes (Node.js + LangGraph)
// Port do hq-orquestrador.ps1 para rodar como JOB no IBM Code Engine,
// reescrito sobre @langchain/langgraph (StateGraph).
//
// Grafo por demanda (handoff real entre papeis, estado via Supabase):
//   PM -> Analista -> Especialista -> QA/revisor -> (CORRIGIR? loop) -> Entrega
//
// Envs:
//   OPENROUTER_API_KEY (segredo)
//   SUPABASE_URL  (opcional, tem default publishable)
//   SUPABASE_KEY  (opcional, tem default publishable)
//   RCLONE_CONF   (default /app/rclone/rclone.conf - montado via Secret)
//   DRIVE_ROOT    (default drive-hq:CEO - Demandas HQ/Entregas)
//   CODIGO        (ex.: D-21; vazio = todas da FASE)
//   FASE          (default "analise,backlog")
//   MODEL         (default minimax/minimax-m3:free)
//   SKIP_QA       (1 para pular a revisao)
//   LOG_LEVEL     (info|quiet)
// ============================================================
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';

const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const API_BASE = process.env.SUPABASE_URL || 'https://mrqjmdfulmnggozwjxlq.supabase.co/rest/v1';
const API_KEY = process.env.SUPABASE_KEY || '';
if (!API_KEY) { console.error('SUPABASE_KEY nao definida (seguranca) — abortando'); process.exit(1); }
const RCLONE_CONF = process.env.RCLONE_CONF || '/app/rclone/rclone.conf';
const DRIVE_ROOT = process.env.DRIVE_ROOT || 'drive-hq:CEO - Demandas HQ/Entregas';
const CODIGO = process.env.CODIGO || '';
const FASE = process.env.FASE || 'analise,backlog';
const MODEL = process.env.MODEL || 'minimax/minimax-m3:free';
const SKIP_QA = process.env.SKIP_QA === '1';
const QUIET = process.env.LOG_LEVEL === 'quiet';
const MAX_REVISOES = 3;

const log = (m, bad = false) => { if (QUIET) return; console.log(`${bad ? '[ERRO] ' : ''}${new Date().toISOString()} ${m}`); };

if (!OR_KEY) { console.error('OPENROUTER_API_KEY nao definida'); process.exit(1); }

const hdrs = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
const oHdrs = { 'Authorization': `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' };

// ---------- IA com fila/backoff ----------
async function ai(content, tokens = 3000, maxRetry = 4) {
  const body = JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], max_tokens: tokens });
  for (let t = 0; t < maxRetry; t++) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: oHdrs, body, signal: AbortSignal.timeout(180000) });
      if (r.status === 429 || r.status === 403 || r.status === 500 || r.status === 503) {
        const back = Math.min(30, 5 * Math.pow(2, t));
        log(`[rate-limit ${r.status}] aguardando ${back}s (tentativa ${t + 1})`, true);
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
      const j = await r.json();
      return String(j.choices[0].message.content);
    } catch (e) {
      if (e.name === 'TimeoutError' || /fetch failed/i.test(String(e.message))) {
        log(`[timeout] retry ${t + 1}`, true);
        await new Promise(res => setTimeout(res, 8_000 * (t + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Falha apos retries (rate-limit persistente)');
}

const ascii = s => String(s ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Supabase ----------
async function getDemandas() {
  const filtro = CODIGO ? `codigo=eq.${CODIGO}` : `or=(${FASE.split(',').map(f => `fase.eq.${f.trim()}`).join(',')})`;
  const url = `${API_BASE}/demandas?${filtro}&select=codigo,titulo,fase,prioridade,progresso,responsavel,descricao&order=id.asc&limit=20`;
  const r = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  return r.json();
}

async function patDemanda(codigo, payload) {
  const r = await fetch(`${API_BASE}/demandas?codigo=eq.${codigo}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}`);
}

async function setEstado(codigo, fase, progresso, msg) {
  const clean = ascii(msg);
  if (!clean) return;
  try {
    await patDemanda(codigo, { fase, progresso });
    const r = await fetch(`${API_BASE}/demandas?codigo=eq.${codigo}&select=descricao`, { headers: hdrs, signal: AbortSignal.timeout(30000) });
    const rows = await r.json();
    const atual = rows && rows[0] ? String(rows[0].descricao || '') : '';
    const base = /\[IA AGENTE\]/.test(atual) ? atual.replace(/\s*\[IA AGENTE\].*/s, '').trim() : atual.trim();
    const nova = base ? `${base} | [IA AGENTE] ${clean}` : `[IA AGENTE] ${clean}`;
    await patDemanda(codigo, { descricao: nova });
  } catch (e) { log(`falha registro ${codigo}: ${e.message}`, true); }
}

// ---------- Upload Drive via rclone ----------
async function pushToDrive(localDir) {
  if (!existsSync(localDir)) return null;
  const name = basename(localDir);
  const remote = `${DRIVE_ROOT}/${name}`;
  let lastErr = '';
  for (let t = 0; t < 3; t++) {
    try {
      const mk = spawnSync('rclone', ['mkdir', remote, '--config', RCLONE_CONF], { stdio: 'ignore' });
      const cp = spawnSync('rclone', ['copy', localDir, remote, '--config', RCLONE_CONF, '--transfers', '4'], { stdio: 'ignore' });
      if (mk.status !== 0 && cp.status !== 0) { lastErr = `mkdir/copy rc ${mk.status}/${cp.status}`; await new Promise(r => setTimeout(r, 4000 * (t + 1))); continue; }
      const ls = spawnSync('rclone', ['lsjson', remote, '--config', RCLONE_CONF], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      let arr = [];
      try { arr = JSON.parse(ls.stdout); } catch {}
      if (Array.isArray(arr) && arr.length > 0 && arr[0].ID) {
        const id = String(arr[0].ID).split(/\s+/)[0].trim();
        if (/^[\w-]+$/.test(id)) return `https://drive.google.com/open?id=${id}`;
      }
      if (ls.status !== 0) { lastErr = `ls rc ${ls.status}`; await new Promise(r => setTimeout(r, 4000 * (t + 1))); continue; }
      const pls = spawnSync('rclone', ['lsjson', DRIVE_ROOT, '--config', RCLONE_CONF], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      let parr = [];
      try { parr = JSON.parse(pls.stdout); } catch {}
      const folder = (parr || []).find(f => f.IsDir && f.Name === name);
      if (folder && folder.ID) { const fid = String(folder.ID).split(/\s+/)[0].trim(); return `https://drive.google.com/open?id=${fid}`; }
      let pdirs = [];
      const pld = spawnSync('rclone', ['lsd', DRIVE_ROOT, '--config', RCLONE_CONF], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      try { pdirs = pld.stdout.split(/\r?\n/).map(l => l.split(/\s+/).pop()).filter(Boolean); } catch {}
      if (pdirs.includes(name)) lastErr = 'pasta criada (pai)';
      return null;
    } catch (e) { lastErr = e.message; await new Promise(r => setTimeout(r, 4000 * (t + 1))); }
  }
  log(`upload Drive com falha persistente: ${lastErr}`, true);
  return null;
}

// Garante a pasta da demanda (CEO - Demandas HQ/Demanda-<codigo>) no Drive,
// como registro obrigatorio para demandas analise/backlog processadas pelo time.
function garantirPastaDemanda(codigo) {
  const raiz = `CEO - Demandas HQ/Demanda-${codigo}`;
  try {
    const mk = spawnSync('rclone', ['mkdir', `drive-hq:${raiz}`, '--config', RCLONE_CONF], { stdio: 'ignore' });
    if (mk.status !== 0) return '';
    const lk = spawnSync('rclone', ['link', `drive-hq:${raiz}`, '--config', RCLONE_CONF], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (lk.status === 0) { const link = String(lk.stdout || '').trim(); return /^https?:\/\//.test(link) ? link : `/perma/${raiz}`; }
    return '';
  } catch (e) { log(`erro pasta Drive ${codigo}: ${e.message}`, true); return ''; }
}

// ---------- Plano do Especialista ----------
const PLANOS = {
  'D-16': { nome: 'demo-D-16', files: ['index.html','app.js','data.js','README.md'], prompt: `
Voce e um desenvolvedor fullstack (ESPECIALISTA). Produza a ENTREGA REAL (codigo-fonte) para: '$titulo'.
Crie dentro do diretorio {dir} estes arquivos:
- index.html : app web multi-site de monitoramento geoambiental (estilo single-page, pt-BR), com seletor de cliente/projeto no topo, dados por cliente simulados em JS, e marca d'agua sobre o mapa/graficos.
- app.js    : logica de roteamento por cliente, troca de dados e aplicacao de marca dagua (sobreposicao opaca) e painel de permissoes (admin/exibicao).
- data.js   : objeto com 2 projetos exemplo (nome, lat, lon, serie de indices) apenas para demonstracao.
- README.md : como implantar/rodar e como adicionar novo cliente.
Gere SOMENTE os 4 arquivos. Cada arquivo deve comecar com a linha '###FILE: <nome.ext>' e conter o conteudo completo. NAO use blocos de codigo markdown dentro dos arquivos. Conteudo em pt-BR, ASCII puro.` },
  'D-17': { nome: 'demo-D-17', files: ['index.html','style.css'], prompt: `
Voce e um especialista comercial de M&V (Measurement & Verification). Produza a ENTREGA REAL (pagina publica) para: '$titulo'.
Crie dentro de {dir}:
- index.html : pagina unica estatica, pt-BR, para prospeccao: hero com proposta de valor, secao de dados de demonstracao (grafico simples em canvas), copy tecnico-comercial, lista de beneficios, e 2 CTAs ('Agendar demo' e 'Solicitar proposta') com links #contato.
- style.css  : estilo moderno responsivo.
Gere SOMENTE os 2 arquivos. Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos de codigo. pt-BR, ASCII puro.` },
  'D-18': { nome: 'demo-D-18', files: ['BOM.csv','manual-calibracao.md'], prompt: `
Voce e um engenheiro/analista de instrumentacao (ESPECIALISTA). Produza a ENTREGA REAL para: '$titulo'.
Crie dentro de {dir}:
- BOM.csv : planilha (CSV, delimitador ';') com colunas: categoria,item,especificacao,fornecedor,quantidade,unidade,criticidade. Liste >=15 componentes de uma estacao meteorologica.
- manual-calibracao.md : manual de calibracao completo (objetivo, periodicidade por sensor, instrumentos de referencia, procedimento passo a passo, tolerancias, criterios de aprovacao, formulario de registro).
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos de codigo. pt-BR, ASCII puro.` },
  'D-19': { nome: 'demo-D-19', files: ['precificacao.csv','proposta-template.md','contrato-14133.md'], prompt: `
Voce e um consultor comercial/juridico (ESPECIALISTA). Produza a ENTREGA REAL para: '$titulo' (Kit Comercial Digital: proposta PDF, contrato de assinatura 14.133 e precificacao).
Crie dentro de {dir}:
- precificacao.csv : tabela de precos (delimitador ';'), colunas: item,descricao,tipo(assinatura|implementacao|suporte),periodicidade,preco_brl. Liste >=8 itens realistas do kit.
- proposta-template.md : template de proposta com capa, escopo, entregaveis, cronograma, investimento e condicoes comerciais.
- contrato-14133.md : minuta de contrato de assinatura referenciando Lei 14.133/2021.
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos de codigo. pt-BR, ASCII puro.` },
  'D-21': { nome: 'demo-D-21', files: ['index.html','README.md'], prompt: `
Voce e um desenvolvedor de sistemas ambientais (ESPECIALISTA). Produza a ENTREGA REAL (esqueleto funcional) para: '$titulo' (Sistema de engenharia ambiental).
Crie dentro de {dir}:
- index.html : dashboard web unica pagina pt-BR abrangendo SST (acidentes, EPIs, treinamentos), Ambiental (monitoramento, residuos, riscos) e Monitoramento (sensores IoT, agua/ar) com cards, tabelas de exemplo e gerenciador simples em JS.
- README.md : arquitetura, modulos planejados e proximos passos de evolucao.
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos de codigo. pt-BR, ASCII puro.` }
};

// ---------- Plano generico (qualquer demanda, via IA) ----------
async function planoPara(d) {
  const hard = PLANOS[d.codigo];
  if (hard) return hard;
  const nome = 'demanda-' + d.codigo;
  const promptGenerico = (files, extra) => `
Voce e o ESPECIALISTA tecnico. Produza a ENTREGA REAL para a demanda '${d.codigo} ${d.titulo}'.
${extra || ''}
Crie dentro de {dir} os arquivos: ${(files || []).join(', ')}
Cada arquivo comeca com a linha '###FILE: <nome.ext>' seguido do conteudo COMPLETO (sem blocos de codigo markdown). Conteudo em pt-BR, ASCII puro.`;
  try {
    const raw = await ai(`
Voce e o PM (gerente de projetos) da equipe. Para a demanda abaixo defina a ENTREGA REAL que uma equipe tecnica deve produzir.
Demanda: codigo=${d.codigo}, titulo=${d.titulo}, fase=${d.fase}
Responda SOMENTE com JSON valido (sem texto extra): {"files":["arquivo.ext", ...]} — 1 a 5 arquivos com extensoes apropriadas (.md, .csv, .html, .json).`, 600);
    const j = JSON.parse(raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim());
    const files = (Array.isArray(j.files) ? j.files : [])
      .filter(f => typeof f === 'string' && /^[\w.\-\u00C0-\u017F ]+$/.test(f.trim()) && f.includes('.'))
      .map(f => f.trim()).slice(0, 8);
    if (!files.length) throw new Error('sem arquivos validos');
    return { nome, files, prompt: promptGenerico(files) };
  } catch {
    return { nome, files: ['relatorio-' + String(d.codigo).toLowerCase() + '.md'], prompt: promptGenerico(['relatorio-' + String(d.codigo).toLowerCase() + '.md'], 'Seja um relatorio completo e objetivo sobre o tema da demanda.') };
  }
}

// ---------- parse ###FILE ----------
function parseFiles(out, dir) {
  let count = 0;
  const parts = out.split(/^###FILE:\s*([^\r\n]+)/m);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    let nome = parts[i].trim();
    if (!nome) continue;
    nome = nome.replace(/[\\/]/g, '\\').replace(/[<>\*\|":]/g, '').replace(/\s+/g, ' ').trim();
    const subs = nome.split(/[\\/]/);
    let target = dir;
    for (let s = 0; s < subs.length - 1; s++) target = join(target, subs[s]);
    mkdirSync(target, { recursive: true });
    let conteudo = parts[i + 1]
      .replace(/^\s*```[^\n]*\n/, '')
      .replace(/\n```\s*$/, '');
    if (nome.includes('.') && !subs[subs.length - 1].includes('.')) continue;
    const fp = join(target, subs[subs.length - 1]);
    writeFileSync(fp, conteudo, 'utf8');
    log(`    [ESPECIALISTA] ${subs[subs.length - 1]} (${statSync(fp).size}B)`);
    count++;
  }
  return count;
}

// ---------- Estado do grafo (LangGraph) ----------
const over = def => Annotation({ reducer: (a, b) => b ?? a, default: () => def });
const State = Annotation.Root({
  codigo: over(''),
  titulo: over(''),
  fase: over(''),
  responsavel: over(''),
  plan: over(null),
  escopo: over(''),
  dir: over(''),
  qaLoop: over(0),
  qaParecer: over(''),
  qaAprovado: over(true),
  corrigindo: over(false),
  link: over(''),
  completo: over(false),
  faltantes: over(''),
});

// ---------- Nós do grafo ----------
// PM: despacha a demanda (entrada da equipe)
async function nodePM(s) {
  const plan = s.plan;
  const dir = join(tmpdir(), plan.nome);
  mkdirSync(dir, { recursive: true });
  for (const f of plan.files) { try { writeFileSync(join(dir, f), ''); } catch {} }
  log(`=== [PM] Despachando ${s.codigo}: ${s.titulo} ===`);
  const linkPasta = garantirPastaDemanda(s.codigo);
  await setEstado(s.codigo, s.fase, 5, `Equipe iniciada (PM): plano ${plan.nome}${linkPasta ? ` | PASTA DRIVE: ${linkPasta}` : ''}`);
  return { dir };
}

// Analista: escreve o escopo que servira de brief ao especialista
async function nodeAnalista(s) {
  const plan = s.plan;
  let escopo = '';
  try {
    escopo = await ai(`
Voce e o ANALISTA da equipe. Entenda a demanda e escreva um paragrafo curto de ESCOPO/ENTREGAVEIS (pt-BR, ASCII, sem acentos) que servira de brief para o especialista.
Demanda: codigo=${s.codigo}, titulo=${s.titulo}, responsavel=${s.responsavel}
Entregaveis esperados: ${plan.files.join(', ')}
Responda apenas com o paragrafo de escopo (3-5 frases).`, 500);
  } catch (e) { escopo = `Escopo: ${s.titulo}`; }
  log('  [ANALISTA] escopo definido.');
  await setEstado(s.codigo, s.fase, 20, `Analista concluiu: ${escopo}`);
  return { escopo };
}

// Especialista: produz/corrige os artefatos
async function nodeEspecialista(s) {
  const plan = s.plan;
  await setEstado(s.codigo, s.fase, s.corrigindo ? 80 : 40, s.corrigindo ? `Especialista corrigindo (iteracao ${s.qaLoop})...` : 'Especialista em producao...');
  let promptTxt;
  if (s.corrigindo) {
    promptTxt = `
Voce e o ESPECIALISTA corrigindo a entrega da demanda '${s.titulo}'. O QA apontou:
${s.qaParecer}
Artefatos esperados: ${plan.files.join(', ')}
Corrija/crie TODOS os arquivos esperados dentro de ${s.dir}. Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos de codigo. pt-BR, ASCII.`;
  } else {
    promptTxt = plan.prompt.replace('$titulo', `${s.codigo} ${s.titulo}`).replace('{dir}', s.dir);
  }
  const out = await ai(promptTxt, 6000, 5);
  if (parseFiles(out, s.dir) === 0) throw new Error('Nenhum arquivo gerado');
  await setEstado(s.codigo, s.fase, 70, 'Especialista entregou artefatos');
  return { corrigindo: false };
}

// QA/Revisor: aprova ou aciona correcao (loop)
async function nodeQA(s) {
  const plan = s.plan;
  if (SKIP_QA) { log('  [QA] pulado (SKIP_QA).'); return { qaAprovado: true, qaLoop: s.qaLoop + 1 }; }
  let resumo = '';
  for (const f of plan.files) { const fp = join(s.dir, f); if (existsSync(fp)) resumo += `[${f}] ${statSync(fp).size}B; `; }
  let statusQA = 'APROVADO', parecer = '';
  try {
    const raw = await ai(`
Voce e o QA/REVISOR da equipe. Revise a entrega para a demanda '${s.titulo}'.
Artefatos esperados: ${plan.files.join(', ')}
Artefatos encontrados: ${resumo}
Escopo definido: ${s.escopo}
Responda SOMENTE com JSON valido (sem texto extra): {"status":"APROVADO"|"CORRIGIR", "pontos":"lista objetiva dos pontos a corrigir"}
Considere: arquivos ausentes, completude em relacao ao escopo, qualidade. Se algum arquivo esperado estiver ausente, status DEVE ser CORRIGIR.`, 400);
    const j = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    statusQA = String(j.status || 'APROVADO').trim().toUpperCase();
    parecer = String(j.pontos || '');
  } catch { statusQA = 'APROVADO'; parecer = 'parecer nao estruturado'; }

  const qaLoop = s.qaLoop + 1;
  if (statusQA === 'CORRIGIR' && qaLoop < MAX_REVISOES) {
    log(`  [QA] CORRIGIR (rev ${qaLoop}) - acionando correcao: ${parecer}`);
    await setEstado(s.codigo, s.fase, 80, `QA (correcao ${qaLoop}): ${parecer}`);
    return { qaAprovado: false, qaParecer: parecer, qaLoop, corrigindo: true };
  }
  const ok = statusQA === 'APROVADO';
  log(`  [QA] ${statusQA} (rev ${qaLoop}) - ${parecer}`);
  await setEstado(s.codigo, s.fase, 85, `QA: ${statusQA} - ${parecer}`);
  return { qaAprovado: ok, qaParecer: parecer, qaLoop, corrigindo: false };
}

// Entrega: gate objetivo final + upload Drive
async function nodeEntrega(s) {
  const plan = s.plan;
  const faltantes = [];
  for (const f of plan.files) {
    const fp = join(s.dir, f);
    if (!existsSync(fp)) faltantes.push(f);
    else if (statSync(fp).size < 300) faltantes.push(`${f}(tamanho)`);
  }
  const completo = faltantes.length === 0;
  let aprovado = s.qaAprovado;
  if (!SKIP_QA && completo) aprovado = true;
  let link = '';
  if ((aprovado || SKIP_QA) && completo) {
    link = await pushToDrive(s.dir) || `${DRIVE_ROOT}/${plan.nome}`;
    await setEstado(s.codigo, 'concluida', 100, `ENTREGA REAL ${new Date().toISOString().slice(0,16)} | DOC: ${link}`);
    log(`  [ENTREGA] ${link}`);
  } else {
    await setEstado(s.codigo, s.fase, 85, `Entrega RETIDA pelo QA (${faltantes.length}/${plan.files.length} pendentes)`);
    log('  [QA] Entrega retida (nao publicada).', true);
  }
  return { completo, faltantes: faltantes.join(','), link };
}

// Rota de saida do QA: CORRIGIR -> volta ao especialista; senao -> entrega
function rotaQA(s) { return s.corrigindo ? 'especialista' : 'entrega'; }

// ---------- Fluxo principal ----------
async function main() {
  log(`== EQUIPE DE AGENTES (Code Engine + LangGraph) - fase=${FASE} codigo=${CODIGO || 'todas'} ==`);
  let demandas = [];
  try { demandas = await getDemandas(); } catch (e) { log(`falha busca: ${e.message}`, true); process.exit(1); }
  if (!Array.isArray(demandas) || demandas.length === 0) { log('Nenhuma demanda para a equipe.'); return; }

  const grafo = new StateGraph(State)
    .addNode('pm', nodePM)
    .addNode('analista', nodeAnalista)
    .addNode('especialista', nodeEspecialista)
    .addNode('qa', nodeQA)
    .addNode('entrega', nodeEntrega)
    .addEdge(START, 'pm')
    .addEdge('pm', 'analista')
    .addEdge('analista', 'especialista')
    .addEdge('especialista', 'qa')
    .addConditionalEdges('qa', rotaQA)
    .addEdge('entrega', END)
    .compile();

  for (const d of demandas) {
    const desc = String(d.descricao || '');
    if (desc.includes('[ESTRATEGICO]')) { log(`[${d.codigo}] conduzida pela equipe estrategica na nuvem - pulando.`); continue; }
    const titulo = (d.codigo + ' ' + d.titulo).trim();
    try {
      const plan = await planoPara(d);
      const res = await grafo.invoke({
        codigo: d.codigo,
        titulo: d.titulo,
        fase: d.fase,
        responsavel: d.responsavel || '',
        plan,
      });
      log(`  [FIM ${titulo}] qaAprovado=${res.qaAprovado} completo=${res.completo} link=${res.link || '-'}`);
    } catch (e) {
      log(`falha na demanda ${d.codigo}: ${e.message}`, true);
      await setEstado(d.codigo, d.fase, 40, `Falha na equipe: ${e.message}`);
    }
  }
  log('Orquestrador concluido.');
}

main().catch(e => { console.error(e); process.exit(1); });