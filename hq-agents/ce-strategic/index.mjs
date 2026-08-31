// ============================================================
// CEO KRAEFEGG M.O. - Backend Estrategico (Node + LangGraph)
// App na nuvem (Code Engine) que executa a hierarquia de decisao:
//
//   VOCE (Diretor/CEO humano - prioridade maxima)
//     -> CEO-agente orquestrador#1 (analisa e estrutura)
//        -> CONSELHO (5 especialistas multi-mercado) - PESQUISA WEB REAL
//           construcao civil | meio ambiente/energia | mineracao/logistica |
//           naval/aeroespacial | IoT/Edge/Embedded/ciencia & informacao
//        -> CEO-agente decide (APROVAR | MELHORAR | REPROPOR)
//           -> ORQUESTRADORES SETORIAIS #2 e #3 + subagentes
//              prospeccao/marketing | gestao | engenharias | IoT/Embedded/Sci
//           -> PRODUTO/SERVICO REAL -> Supabase (+ Drive)
//
// REST protegido por token (X-HQ-Token). Persiste no Supabase (tabela demandas).
//
// Envs:
//   HQ_ACCESS_TOKEN  (chave de acesso simples do portal)
//   OPENROUTER_API_KEY
//   SEARCH_MODEL     (modelo com web search; default openrouter/auto)
//   MODEL            (modelo default; default minimax/minimax-m3:free)
//   SUPABASE_URL / SUPABASE_KEY
// ============================================================
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';

const PORT = process.env.PORT || 8080;
const ACCESS = process.env.HQ_ACCESS_TOKEN || 'kraefegg-mo-2026';
const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const API_BASE = process.env.SUPABASE_URL || 'https://mrqjmdfulmnggozwjxlq.supabase.co/rest/v1';
const API_KEY = process.env.SUPABASE_KEY || 'sb_publishable_PGW_hFT4bnzA_bIS8EPx6g_LvxWNP4Y';
const MODEL = process.env.MODEL || 'minimax/minimax-m3:free';
const SEARCH_MODEL = process.env.SEARCH_MODEL || 'openrouter/auto';
const MAX_REVISOES = 2;

const log = (...a) => console.log(new Date().toISOString(), ...a);
if (!OR_KEY) { console.error('OPENROUTER_API_KEY nao definida'); process.exit(1); }

const hdrs = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
const oHdrs = { 'Authorization': `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' };

// ---------- Google Drive via rclone (secret hq-rclone) ----------
// O secret generic "hq-rclone" e montado no Code Engine como arquivo
// (chave rclone.conf) em /etc/config/. O rclone cria pastas e faz upload.
const RCLONE_BIN = process.env.RCLONE_BIN || 'rclone';
const RCLONE_CONF = process.env.RCLONE_CONF || '/etc/config/rclone.conf';
const DRIVE_REMOTE = 'drive-hq';
const exec = promisify(execFile);

function driveRun(args) {
  return exec(RCLONE_BIN, ['--config', RCLONE_CONF, ...args], { timeout: 90000, maxBuffer: 16 * 1024 * 1024 })
    .then(r => r.stdout.trim())
    .catch(e => { throw new Error('rclone: ' + ((e && e.message) || e)); });
}
async function driveMkdir(remotePath) { await driveRun(['mkdir', `${DRIVE_REMOTE}:${remotePath}`]); }
async function driveUpload(localFile, remotePath) { await driveRun(['copyto', localFile, `${DRIVE_REMOTE}:${remotePath}`]); }
async function driveLink(remotePath) { try { return await driveRun(['link', `${DRIVE_REMOTE}:${remotePath}`]); } catch { return ''; } }

// Subpastas padrao (reports por setor) dentro da pasta da demanda
const PASTA_SETORES = {
  '01-Mercado': 'Mercado & Inteligencia',
  '02-P&D': 'Pesquisa & Desenvolvimento',
  '03-Comercial': 'Prospeccao & Marketing',
  '04-Engenharia': 'Engenharias',
  '05-Ambiental': 'Ambiental & Seguranca',
  '06-Entregas': 'Entregas e resultado',
};

// ---------- IA (chat) com retry/backoff ----------
async function ai(content, { model = MODEL, tokens = 4000, maxRetry = 4 } = {}) {
  const body = JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: tokens });
  for (let t = 0; t < maxRetry; t++) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: oHdrs, body, signal: AbortSignal.timeout(300000) });
      if (r.status === 429 || r.status === 403 || r.status === 500 || r.status === 503) {
        const back = Math.min(30, 5 * Math.pow(2, t));
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
      const j = await r.json();
      return String(j.choices[0].message.content || '');
    } catch (e) {
      if (e.name === 'TimeoutError' || /fetch failed/i.test(String(e.message))) {
        await new Promise(res => setTimeout(res, 8000 * (t + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Falha apos retries (rate-limit persistente)');
}

// ---------- Pesquisa web real (multi-fontes) ----------
// Usa modelo com capacidade de busca (web) do OpenRouter para retornar
// cidacoes de multiplas fontes reais; fallback para o modelo default.
async function pesquisaWeb(papel, setor, pergunta) {
  const prompt = [
    `Voce e um especialista de mercado (${papel}) realizando PESQUISA WEB REAL.`,
    `Setor/mercado: ${setor}`,
    `Questao a investigar: ${pergunta}`,
    '',
    'Execute uma busca na web por FONTES REAIS E MULTIPLAS (relatorios de mercado, dados de ',
    'governo/agencias, noticias, publicacoes setoriais, tendencias e metricas quantitativas).',
    'Retorne (pt-BR, ASCII puro, sem acentos) em formato objetivo:',
    '1) DADOS: principais metricas, tamanho de mercado, crescimento, drivers e riscos (com numeros).',
    '2) FONTES: lista de 3-6 fontes reais com nome e URL (dominio).',
    '3) OPORTUNIDADES: 3-5 oportunidades de produto/servico para a consultoria KRAEFEGG.',
    '4) ALVOS: tipos de empresas/investidores/publico-alvo.',
    'Seja concreto e baseado em informacoes reais pesquisadas.'
  ].join('\n');
  try {
    return await ai(prompt, { model: SEARCH_MODEL, tokens: 3000 });
  } catch (e) {
    log(`[websearch fallback] ${papel}: ${e.message}`);
    try { return await ai(prompt, { model: MODEL, tokens: 3000 }); } catch (_) { return `(sem pesquisa: ${e.message})`; }
  }
}

// ---------- Supabase: demandas ----------
async function getDemanda(codigo) {
  const r = await fetch(`${API_BASE}/demandas?codigo=eq.${codigo}`, { headers: hdrs, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}
async function criarDemanda({ codigo, titulo, ideia, prioridade }) {
  const body = { codigo, titulo, descricao: `[IDEIA DIRETOR] ${ideia}`, responsavel: 'Railson Arruda (Diretor)', area: 'estrategia', fase: 'analise', prioridade: prioridade || 'alta', progresso: 0 };
  const r = await fetch(`${API_BASE}/demandas`, { method: 'POST', headers: { ...hdrs, Prefer: 'return=representation' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase POST ${r.status}`);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : body;
}
async function patDemanda(codigo, payload) {
  const r = await fetch(`${API_BASE}/demandas?codigo=eq.${codigo}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}`);
}
async function appendLog(codigo, nota) {
  const ascii = String(nota ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!ascii) return;
  try {
    const d = await getDemanda(codigo);
    const atual = d?.descricao || '';
    const nova = atual ? `${atual} | [AGENTE] ${ascii}` : `[AGENTE] ${ascii}`;
    await patDemanda(codigo, { descricao: nova });
  } catch (e) { log(`falha log ${codigo}: ${e.message}`); }
}
async function setFase(codigo, fase, progresso, nota) {
  await patDemanda(codigo, { fase, progresso });
  if (nota) await appendLog(codigo, nota);
}

// ---------- Dicionario: conselho (5 especialistas multi-mercado) ----------
const CONSELHO = [
  { id: 'c1', papel: 'Construcao Civil & Infraestrutura', setor: 'construcao civil e infraestrutura', foco: 'incorporacao, obras, materiais, retrofit, BIM, normas' },
  { id: 'c2', papel: 'Meio Ambiente & Energia', setor: 'meio ambiente, sustentabilidade e energia', foco: 'licenciamento, ESG, renovaveis, eficiencia, descarbonizacao' },
  { id: 'c3', papel: 'Mineração & Logística', setor: 'mineracao, logistica e supply chain', foco: 'operacoes, cadeia de suprimentos, portos, transporte' },
  { id: 'c4', papel: 'Naval & Aeroespacial', setor: 'naval, offshore e aeroespacial', foco: 'embarcacoes, plataformas, regulacao maritima, defesa' },
  { id: 'c5', papel: 'IoT, Edge AI & Tecnologia da Informacao', setor: 'IoT, Edge AI, Embedded Systems, Computer Science & Information', foco: 'sensores, IA embarcada, dados, ciberseguranca, plataformas' },
];

// ---------- Orquestradores setoriais + subagentes ----------
const SETORES = [
  { id: 's1', nome: 'Mercado & Inteligencia', subagentes: ['Analise de mercado', 'Inteligencia competitiva', 'Pesquisa de clientes', 'Tendencias de mercado'] },
  { id: 's2', nome: 'Pesquisa & Desenvolvimento', subagentes: ['Gestao de P&D', 'Gestao tecnologica', 'Prospeccao tecnologica', 'Inovacao'] },
  { id: 's3', nome: 'Prospeccao & Marketing', subagentes: ['Branding', 'Vendas B2B', 'Proposta comercial', 'Marketing digital'] },
  { id: 's4', nome: 'Engenharias', subagentes: ['Engenharia civil', 'Engenharia ambiental', 'Engenharia de minas', 'Engenharia naval/aeroespacial'] },
  { id: 's5', nome: 'Ambiental & Seguranca', subagentes: ['Gestao ambiental', 'Seguranca operacional', 'Licenciamento', 'Gestao de riscos'] },
  { id: 's6', nome: 'Entregas e resultado', subagentes: ['Gestao de entregas', 'Governanca', 'Gestao juridica/legal', 'Plano de acao'] },
];

// ---------- Estado do grafo ----------
const over = def => Annotation({ reducer: (a, b) => b ?? a, default: () => def });
const State = Annotation.Root({
  codigo: over(''), titulo: over(''), ideia: over(''),
  questao: over(''), conselho: over(''), decisao: over(''),
  despacho: over(''), resultado: over(''), finalizado: over(false),
});

// CEO-agente orquestrador#1: entende a ideia e estrutura a questao estrategica
async function nodeCEO_Estrutura(s) {
  await setFase(s.codigo, 'analise', 10, 'CEO-agente analisando a ideia...');
  const q = await ai(`
Voce e o CEO-agente orquestrador n.1 de uma consultoria multidisciplinar KRAEFEGG
(construcao civil, meio ambiente, energia, mineracao, logistica, naval, aeroespacial, IoT/Edge).

Ideia do Diretor (proprietario): "${s.ideia}"

Sua tarefa: transformar essa ideia em uma QUESTAO ESTRATEGICA clara para investigacao de
mercado pelo conselho de 5 especialistas. Retorne (pt-BR ASCII): a questao (pergunta),
o objetivo de negocio, os alvos (empresas/investidores/publico) e as dimensoes de mercado
a investigar. Texto objetivo, 4-8 frases.`, 1500);
  await setFase(s.codigo, 'analise', 20, 'CEO estruturou a questao estrategica');
  return { questao: q };
}

// Conselho: 5 especialistas pesquisam em paralelo
async function nodeConselho(s) {
  await setFase(s.codigo, 'analise', 30, 'Conselho de 5 especialistas pesquisando mercado...');
  const pareceres = [];
  for (const c of CONSELHO) {
    await setFase(s.codigo, 'analise', 30 + CONSELHO.indexOf(c) * 4, `Conselheiro ${c.papel} pesquisando...`);
    const r = await pesquisaWeb(c.papel, c.setor, `${s.questao}\nFoco do conselheiro: ${c.foco}`);
    pareceres.push({ id: c.id, papel: c.papel, parecer: r });
    log(`[conselho] ${c.id} ok`);
  }
  return { conselho: JSON.stringify(pareceres) };
}

// CEO-agente decide
async function nodeCEO_Decide(s) {
  await setFase(s.codigo, 'analise', 55, 'CEO-agente consolidando e decidindo...');
  const decisao = await ai(`
Voce e o CEO-agente orquestrador n.1. Consolide os pareceres do conselho e DECIDA o
direcionamento da empresa. 
Questao: ${s.questao}
Pareceres do conselho (pesquisa web):
${s.conselho}
Decida em pt-BR ASCII e retorne SOMENTE JSON valido (sem texto extra) no formato:
{"veredito":"APROVAR|MELHORAR|REPROPOR","decisao":"<decisao em 2-4 frases>","foco":"<foco de produto/servico>","alvos":"<alvos>","setor_prioritario":"<setor>"}
Considere: aderencia ao perfil da KRAEFEGG (multimercado), oportunidade real e exequivel,
e necessidade do mercado. Se MELHORAR/REPROPOR, inclua a correcao/proposta na decisao.`, 1500);
  let d = {};
  try { d = JSON.parse(decisao.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { d = { veredito: 'APROVAR', decisao: decisao }; }
  await setFase(s.codigo, d.veredito === 'APROVAR' ? 'execucao' : 'revisao', 60, `CEO decidiu: ${d.veredito}`);
  return { decisao: JSON.stringify(d) };
}

const sanitize = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Produz o report de um setor com seus subagentes atuando em TIME: cada
// subagente recebe o contexto produzido pelo anterior e o enriquece.
async function gerarReportSetorEmTime(s, st, d) {
  const titulo = `# Report de Setor - ${st.nome}\n\nDemanda: ${s.codigo} - ${s.titulo}\nDecisao CEO: ${d.decisao || ''}\n\n`;
  let contexto = `Questao estrategica: ${s.questao}\n\n`;
  const secoes = [];
  for (let i = 0; i < st.subagentes.length; i++) {
    const sub = st.subagentes[i];
    const secao = await ai(`
Voce e o subagente "${sub}" do setor "${st.nome}" da consultoria KRAEFEGG. A firma opera em
TIME: os subagentes colaboram em sequencia, cada um construindo sobre o trabalho do anterior.
Contexto ja produzido pelo time (leia e use):
${contexto}
Sua contribuicao: produza a secao "${sub}" do report deste setor (pt-BR, ASCII, Markdown):
- Analise objetiva e acionavel, com dados/propostas concretas.
- Como se conecta com o que ja foi escrito acima (nao repita, avance).
- 4-8 frases.`, 2000);
    secoes.push(`## ${sub}\n\n${secao}\n`);
    contexto += `\n[Secao ${sub}]\n${secao}\n`;
  }
  return titulo + secoes.join('\n');
}

// Orquestradores setoriais produzem produto/servico real em TIME, gerando
// reports .md por setor e publicando no Google Drive (via rclone).
async function nodeDespacho(s) {
  await setFase(s.codigo, 'execucao', 65, 'Orquestradores setoriais em time, produzindo reports e publicando no Drive...');
  const d = JSON.parse(s.decisao || '{}');
  const raizPasta = `CEO - Demandas HQ/Demanda-${s.codigo}`;
  const dirBase = join('/app/out', s.codigo);
  mkdirSync(dirBase, { recursive: true });

  // 1) Cria a estrutura de pastas no Drive (1x) e registra o link
  let linkPasta = '';
  for (const sub of Object.keys(PASTA_SETORES)) {
    try { await driveMkdir(`${raizPasta}/${sub}`); } catch {}
  }
  try { linkPasta = await driveLink(raizPasta); } catch {}
  await appendLog(s.codigo, `DRIVE: ${linkPasta || raizPasta}`);

  // 2) Produz e publica o report de cada setor (subagentes em sequencia coordenada)
  const blocos = [];
  let setorIdx = 0;
  for (const st of SETORES) {
    await setFase(s.codigo, 'execucao', 65 + setorIdx * 6, `Setor ${st.nome}: subagentes em time produzindo report...`);
    setorIdx++;
    const sub = Object.keys(PASTA_SETORES).find(k => PASTA_SETORES[k] === st.nome) || '';
    const nomeArq = `report-${st.id}-${sanitize(st.nome)}.md`;
    const relDir = sub ? `${raizPasta}/${sub}` : raizPasta;
    const md = await gerarReportSetorEmTime(s, st, d);
    blocos.push(`[${st.nome}]\n${md}`);
    const local = join(dirBase, nomeArq);
    writeFileSync(local, md, 'utf8');
    try {
      await driveUpload(local, `${relDir}/${nomeArq}`);
    } catch (e) {
      await appendLog(s.codigo, `Upload Drive falhou (${st.nome}): ${e.message}`);
    }
  }
  await setFase(s.codigo, 'execucao', 92, 'Reports por setor publicados no Drive');
  return { despacho: blocos.join('\n\n') };
}

// Resultado final consolidado
async function nodeResultado(s) {
  const d = JSON.parse(s.decisao || '{}');
  const resultado = await ai(`
Voce e o CEO-agente orquestrador n.1. Consolide o RESULTADO FINAL estrategico da empresa
para a ideia do Diretor.
Decisao: ${d.decisao || ''}
Direcionamento setorial:
${s.despacho}
Retorne (pt-BR ASCII) um RESUMO EXECUTIVO final em bullets: recomendacao, produto/servico,
proximos passos, e como o Diretor pode ajustar. 5-8 bullets.`, 2500);
  await setFase(s.codigo, 'concluida', 100, `RESULTADO ESTRATEGICO | CEO: ${d.decisao || 'aprovado'}`);
  await appendLog(s.codigo, `REPORTS POR SETOR no Drive: CEO - Demandas HQ/Demanda-${s.codigo}/`);
  return { resultado, finalizado: true };
}

const grafo = new StateGraph(State)
  .addNode('n_estrutura', nodeCEO_Estrutura)
  .addNode('n_conselho', nodeConselho)
  .addNode('n_decide', nodeCEO_Decide)
  .addNode('n_despacho', nodeDespacho)
  .addNode('n_resultado', nodeResultado)
  .addEdge(START, 'n_estrutura')
  .addEdge('n_estrutura', 'n_conselho')
  .addEdge('n_conselho', 'n_decide')
  .addEdge('n_decide', 'n_despacho')
  .addEdge('n_despacho', 'n_resultado')
  .addEdge('n_resultado', END)
  .compile();

// ---------- Executa uma demanda ----------
async function executar(codigo) {
  const d = await getDemanda(codigo);
  if (!d) throw new Error('demanda nao encontrada');
  const ideia = String(d.descricao || d.titulo || '').replace(/^\[IDEIA DIRETOR\]\s*/i, '').trim();
  // Política: toda demanda (backlog/análise) ganha pasta no Drive, mesmo em revisão
  const raizPasta = `CEO - Demandas HQ/Demanda-${d.codigo}`;
  try {
    await driveMkdir(raizPasta);
    const link = await driveLink(raizPasta);
    await appendLog(d.codigo, `PASTA DRIVE: ${link || raizPasta}`);
  } catch (e) {
    await appendLog(d.codigo, `AVISO Drive: ${e.message}`);
  }
  const st = await grafo.invoke({ codigo: d.codigo, titulo: d.titulo, ideia: ideia || d.titulo });
  return st;
}

// ---------- HTTP server (REST) ----------
function readBody(req) {
  return new Promise((res, rej) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => res(b));
    req.on('error', rej);
  });
}
function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token',
    'Access-Control-Max-Age': '86400'
  });
  res.end(JSON.stringify(obj));
}

const server = createServer(async (req, res) => {
  // Preflight CORS (requisicoes cross-origin do navegador)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }
  const url = new URL(req.url, 'http://x');
  const auth = req.headers['x-hq-token'];
  const u = url.pathname;

  const autorizado = (req, res, fn) => {
    if (auth !== ACCESS) return json(res, 401, { erro: 'acesso negado' });
    return fn();
  };

  // Health (aberto)
  if (req.method === 'GET' && (u === '/health' || u === '/')) return json(res, 200, { ok: true, servico: 'ce-strategic' });

  // POST /demanda  -> cria e dispara a demanda estrategica
  if (req.method === 'POST' && u === '/demanda') {
    return autorizado(req, res, async () => {
      try {
        const body = JSON.parse((await readBody(req)) || '{}');
        const ideia = String(body.ideia || '').trim();
        if (!ideia) return json(res, 400, { erro: 'campo ideia obrigatorio' });
        const codigo = String(body.codigo || 'S-' + Date.now().toString(36).toUpperCase());
        let rec;
        try { rec = await getDemanda(codigo); } catch { rec = null; }
        if (!rec) await criarDemanda({ codigo, titulo: body.titulo || ideia.slice(0, 60), ideia, prioridade: body.prioridade });
        // dispara assincronamente
        executar(codigo).catch(e => { log(`falha ${codigo}: ${e.message}`); setFase(codigo, 'falha', 40, `Falha: ${e.message}`).catch(() => {}); });
        return json(res, 202, { codigo, status: 'em_processamento', msg: 'demanda despachada ao CEO e conselho' });
      } catch (e) { log('erro POST /demanda', e); return json(res, 500, { erro: e.message }); }
    });
  }

  // GET /demanda/:codigo -> status
  const m = u.match(/^\/demanda\/([^/]+)$/);
  if (req.method === 'GET' && m) {
    return autorizado(req, res, async () => {
      try {
        const d = await getDemanda(m[1]);
        if (!d) return json(res, 404, { erro: 'nao encontrada' });
        return json(res, 200, { codigo: d.codigo, titulo: d.titulo, fase: d.fase, progresso: d.progresso, log: d.descricao || '' });
      } catch (e) { return json(res, 500, { erro: e.message }); }
    });
  }

  // GET /demandas -> lista (status console)
  if (req.method === 'GET' && u === '/demandas') {
    return autorizado(req, res, async () => {
      try {
        const r = await fetch(`${API_BASE}/demandas?select=codigo,titulo,fase,prioridade,progresso,responsavel&order=id.desc&limit=30`, { headers: hdrs, signal: AbortSignal.timeout(30000) });
        const arr = await r.json();
        return json(res, 200, Array.isArray(arr) ? arr : []);
      } catch (e) { return json(res, 500, { erro: e.message }); }
    });
  }

  return json(res, 404, { erro: 'rota nao encontrada' });
});

server.listen(PORT, () => log(`CE-STRATEGIC ouvindo na porta ${PORT}`));
