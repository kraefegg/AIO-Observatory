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
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { Guardrails, aiComGuardrail, checkNoSecrets, parseJSON } from './guardrails.mjs';

const PORT = process.env.PORT || 8080;
// Seguranca: token de acesso SOMENTE via ambiente; sem fallback hardcoded (fail-safe).
const ACCESS = process.env.HQ_ACCESS_TOKEN || '';
const CORS_ALLOWED = (process.env.CORS_ALLOW || 'https://kraefegg-mo.2e4s1hfdcw14.br-sao.codeengine.appdomain.cloud')
  .split(';').map(s => s.trim()).filter(Boolean);
const RATE = { janela: 600000, limiteGeral: 180, limiteMutacao: 60, limiteProcessar: 6 };
const DEMANDA_CAMPOS = new Set(['codigo', 'titulo', 'descricao', 'responsavel', 'fase', 'prioridade', 'progresso', 'criado_em', 'atualizado_em', 'area', 'status']);
const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const API_BASE = process.env.SUPABASE_URL || 'https://mrqjmdfulmnggozwjxlq.supabase.co/rest/v1';
const API_KEY = process.env.SUPABASE_KEY || '';
const MODEL = process.env.MODEL || 'minimax/minimax-m3:free';
const SEARCH_MODEL = process.env.SEARCH_MODEL || 'openrouter/auto';
const MAX_REVISOES = 2;

// Demandas em execucao na nuvem (evita disparo duplicado de /demanda e /processar)
const EM_EXECUCAO = new Set();

const log = (...a) => console.log(new Date().toISOString(), ...a);
if (!OR_KEY) { console.error('OPENROUTER_API_KEY nao definida'); process.exit(1); }

const hdrs = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
const oHdrs = { 'Authorization': `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' };

// ---------- Supabase com retry/backoff (garantia de conexao) ----------
async function supabaseJson(url, init, { tentativas = 3, origem = 'Supabase' } = {}) {
  let lastErr = null;
  for (let t = 0; t < tentativas; t++) {
    try {
      const r = await fetch(url, Object.assign({}, init, { signal: AbortSignal.timeout(30000) }));
      if (r.status === 429 || r.status >= 500) {
        const back = Math.min(20, 3 * Math.pow(2, t));
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      return r;
    } catch (e) {
      if (/fetch failed|TimeoutError|ECONNRESET|socket hang up|EPIPE/i.test(String(e.message || e.name))) {
        lastErr = e;
        const back = Math.min(20, 3 * Math.pow(2, t));
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error(`${origem} indisponivel apos retries`);
}

// ---------- Google Drive via rclone (secret hq-rclone) ----------
// O secret generic "hq-rclone" e montado no Code Engine como arquivo
// (chave rclone.conf) em /etc/config/. O rclone cria pastas e faz upload.
const RCLONE_BIN = process.env.RCLONE_BIN || 'rclone';
const RCLONE_CONF = process.env.RCLONE_CONF || '/etc/config/rclone.conf';
const DRIVE_REMOTE = 'drive-hq';
const exec = promisify(execFile);

function driveRun(args, timeout = 90000) {
  return exec(RCLONE_BIN, ['--config', RCLONE_CONF, ...args], { timeout, maxBuffer: 16 * 1024 * 1024 })
    .then(r => r.stdout.trim())
    .catch(e => { throw new Error('rclone: ' + ((e && e.message) || e)); });
}
async function driveMkdir(remotePath) { await driveRun(['mkdir', `${DRIVE_REMOTE}:${remotePath}`]); }
async function driveUpload(localFile, remotePath) { await driveRun(['copyto', localFile, `${DRIVE_REMOTE}:${remotePath}`]); }
async function driveLink(remotePath) { try { return await driveRun(['link', `${DRIVE_REMOTE}:${remotePath}`]); } catch { return ''; } }

// Garante que a pasta da demanda EXISTA e esteja acessivel no Drive (com retry).
// Politica: toda demanda (analise ou backlog) recebe registro em kraefegg.mos3@gmail.com.
async function garantirPastaDrive(raizPasta) {
  let lastErr = '';
  for (let t = 0; t < 3; t++) {
    try {
      await driveRun(['mkdir', `${DRIVE_REMOTE}:${raizPasta}`]);
      const link = await driveRun(['link', `${DRIVE_REMOTE}:${raizPasta}`]);
      return link;
    } catch (e) {
      lastErr = e.message;
      await new Promise(res => setTimeout(res, 2500 * (t + 1)));
    }
  }
  return { erro: lastErr };
}

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
// Modelos reserva (fallback) caso o modelo principal retorne 402 (quota free esgotada)
const MODEL_BACKUP = ['deepseek/deepseek-chat-v3-0324:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen-2.5-72b-instruct:free'];

async function ai(content, { model = MODEL, tokens = 4000, maxRetry = 5 } = {}) {
  let m = model;
  let pay402 = 0;
  for (let t = 0; t < maxRetry; t++) {
    const body = JSON.stringify({ model: m, messages: [{ role: 'user', content }], max_tokens: tokens });
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: oHdrs, body, signal: AbortSignal.timeout(300000) });
      if (r.status === 429 || r.status === 402 || r.status === 403 || r.status === 500 || r.status === 503) {
        if (r.status === 402 && ++pay402 >= 2 && MODEL_BACKUP.length) {
          m = MODEL_BACKUP.shift();
          pay402 = 0;
          await new Promise(res => setTimeout(res, 4000));
          continue;
        }
        const back = Math.min(40, 6 * Math.pow(2, t));
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
      const j = await r.json();
      if (!j.choices || !j.choices[0] || !j.choices[0].message) throw new Error('sem choices (resposta malformada)');
      return String(j.choices[0].message.content || '');
    } catch (e) {
      if (e.name === 'TimeoutError' || /fetch failed|sem choices|malformada|HTTP 402/i.test(String(e.message))) {
        const back = Math.min(40, 8 * Math.pow(2, t));
        await new Promise(res => setTimeout(res, back * 1000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Falha apos retries (modelos indisponiveis)');
}

// ---------- Pesquisa web real (multi-fontes) com guardrail ----------
// Usa modelo com capacidade de busca (web) + fallback; saida validada
// contra segredos e tamanho minimo antes de seguir no fluxo.
function promptPesquisa(cpapel, setor, foco, questao) {
  return [
    `Voce e um especialista de mercado (${cpapel}) realizando PESQUISA WEB REAL.`,
    `Setor/mercado: ${setor}. Foco: ${foco}`,
    `Questao a investigar: ${questao}`,
    '',
    'Execute uma busca na web por FONTES REAIS E MULTIPLAS (relatorios, dados de ',
    'gov/agencias, noticias, metricas quantitativas).',
    'Retorne (pt-BR, ASCII puro) em formato objetivo:',
    '1) DADOS: metricas, tamanho de mercado, crescimento, drivers e riscos (numeros).',
    '2) FONTES: lista de 3-6 fontes reais com nome e URL (dominio).',
    '3) OPORTUNIDADES: 3-5 oportunidades de produto/servico para a KRAEFEGG.',
    '4) ALVOS: tipos de empresas/investidores/publico-alvo.',
    'NAO inclua chaves, tokens, senhas ou dados sensiveis no parecer.',
    'Seja concreto e baseado em informacoes reais pesquisadas.'
  ].join('\n');
}

async function pesquisaComGuardrail(cpapel, setor, foco, questao) {
  const prompt = promptPesquisa(cpapel, setor, foco, questao);
  try {
    return await aiComGuardrail(ai, prompt, Guardrails.parecer, { model: SEARCH_MODEL, tokens: 3000 });
  } catch (e) {
    log(`[websearch fallback] ${cpapel}: ${e.message}`);
    try { return await aiComGuardrail(ai, prompt, Guardrails.parecer, { model: MODEL, tokens: 3000 }); }
    catch (_) { return `(sem pesquisa: ${e.message})`; }
  }
}

// ---------- Supabase: demandas ----------
async function getDemanda(codigo) {
  const r = await supabaseJson(`${API_BASE}/demandas?codigo=eq.${codigo}`, { headers: hdrs });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}
async function criarDemanda({ codigo, titulo, ideia, prioridade }) {
  const body = { codigo, titulo, descricao: `[IDEIA DIRETOR] ${ideia}`, responsavel: 'Railson Arruda (Diretor)', area: 'estrategia', fase: 'analise', prioridade: prioridade || 'alta', progresso: 0 };
  const r = await supabaseJson(`${API_BASE}/demandas`, { method: 'POST', headers: { ...hdrs, Prefer: 'return=representation' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase POST ${r.status}`);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : body;
}
async function patDemanda(codigo, payload) {
  const r = await supabaseJson(`${API_BASE}/demandas?codigo=eq.${codigo}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}`);
}
async function appendLog(codigo, nota) {
  const ascii = String(nota ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!ascii) return;
  // Guardrail anti-vazamento: nunca grava chaves no Supabase
  const sec = checkNoSecrets(ascii);
  const texto = sec.ok ? ascii : '[CONTROLE] entrada bloqueada por guardrail de seguranca';
  try {
    const d = await getDemanda(codigo);
    const atual = d?.descricao || '';
    const nova = atual ? `${atual} | [AGENTE] ${texto}` : `[AGENTE] ${texto}`;
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
  const q = await aiComGuardrail(ai, `
Voce e o CEO-agente orquestrador n.1 de uma consultoria multidisciplinar KRAEFEGG
(construcao civil, meio ambiente, energia, mineracao, logistica, naval, aeroespacial, IoT/Edge).

Ideia do Diretor (proprietario): "${s.ideia}"

SUA TAREFA (single-purpose: apenas estruturar a questao estrategica):
Transformar essa ideia em uma QUESTAO ESTRATEGICA clara para investigacao de
mercado pelo conselho de 5 especialistas.

SAIDA ESPERADA (4-8 frases, pt-BR ASCII, objetiva):
- a questao (pergunta central)
- o objetivo de negocio
- os alvos (empresas/investidores/publico)
- as dimensoes de mercado a investigar

NAO execute pesquisa nem decida aqui — apenas estruture a questao.`, Guardrails.questao, { tokens: 1500 });
  await setFase(s.codigo, 'analise', 20, 'CEO estruturou a questao estrategica');
  return { questao: q };
}

// Conselho: 5 especialistas pesquisam em paralelo
async function nodeConselho(s) {
  await setFase(s.codigo, 'analise', 30, 'Conselho de 5 especialistas pesquisando mercado...');
  const pareceres = [];
  for (const c of CONSELHO) {
    await setFase(s.codigo, 'analise', 30 + CONSELHO.indexOf(c) * 4, `Conselheiro ${c.papel} pesquisando...`);
    const r = await pesquisaComGuardrail(c.papel, c.setor, c.foco, s.questao);
    pareceres.push({ id: c.id, papel: c.papel, parecer: r });
    log(`[conselho] ${c.id} ok`);
  }
  return { conselho: JSON.stringify(pareceres) };
}

// CEO-agente decide
async function nodeCEO_Decide(s) {
  await setFase(s.codigo, 'analise', 55, 'CEO-agente consolidando e decidindo...');
  const prompt = `
Voce e o CEO-agente orquestrador n.1. Consolide os pareceres do conselho e DECIDA o
direcionamento da empresa.
Questao: ${s.questao}
Pareceres do conselho (pesquisa web):
${s.conselho}
Decida em pt-BR ASCII e retorne SOMENTE JSON valido (sem texto extra) no formato:
{"veredito":"APROVAR|MELHORAR|REPROPOR","decisao":"<decisao em 2-4 frases>","foco":"<foco de produto/servico>","alvos":"<alvos>","setor_prioritario":"<setor>"}
Considere: aderencia ao perfil da KRAEFEGG (multimercado), oportunidade real e exequivel,
e necessidade do mercado. Se MELHORAR/REPROPOR, inclua a correcao/proposta na decisao.`;
  const decisao = await aiComGuardrail(ai, prompt, Guardrails.decisao, { tokens: 1500 });
  const d = parseJSON(decisao) || { veredito: 'APROVAR', decisao: '[fallback] decisao nao estruturada' };
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
  const resultado = await aiComGuardrail(ai, `
Voce e o CEO-agente orquestrador n.1. Consolide o RESULTADO FINAL estrategico da empresa
para a ideia do Diretor.
Decisao: ${d.decisao || ''}
Direcionamento setorial:
${s.despacho}
SAIDA ESPERADA: RESUMO EXECUTIVO final em bullets (pt-BR ASCII): [1] recomendacao,
[2] produto/servico, [3] proximos passos, [4] como o Diretor pode ajustar. 5-8 bullets.`, Guardrails.resultado, { tokens: 2500 });
  await setFase(s.codigo, 'concluida', 97, `RESULTADO ESTRATEGICO | CEO: ${d.decisao || 'aprovado'}`);
  await appendLog(s.codigo, `REPORTS POR SETOR no Drive: CEO - Demandas HQ/Demanda-${s.codigo}/`);
  return { resultado, finalizado: true };
}

// ---------- Exportables multiformato (md/json/csv/xml/txt/PDF/RTF) ----------
const escXml = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const escPdfTxt = t => String(t ?? '').replace(/([\\()])/g, '\\$1');
const escRtf = t => String(t ?? '').replace(/[\\{}]/g, m => '\\' + m);
const escCsv = t => { const s = String(t ?? ''); return /[;\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function pacoteExportables(s) {
  const d = JSON.parse(s.decisao || '{}');
  return {
    codigo: s.codigo, titulo: s.titulo, questao: s.questao,
    veredito: d.veredito || '', decisao: d.decisao || '', foco: d.foco || '',
    alvos: d.alvos || '', setor_prioritario: d.setor_prioritario || '',
    conselho: String(s.conselho || '').replace(/\s+/g, ' ').slice(0, 1200),
    despacho: String(s.despacho || '').replace(/\s+/g, ' ').slice(0, 2500),
    resultado: s.resultado || '',
    gerado_em: new Date().toISOString()
  };
}
function mkMarkdown(p) {
  const d = JSON.parse(JSON.stringify(p));
  return `# ${d.codigo} - ${d.titulo}

**Questao:** ${d.questao}
**Veredito:** ${d.veredito} | **Foco:** ${d.foco} | **Setor:** ${d.setor_prioritario}
**Alvos:** ${d.alvos}

## Conselho (pesquisa web)
${d.conselho || '(sem parecer)'}

## Direcionamento setorial
${d.despacho || '(sem despacho)'}

## Resultado executivo
${d.resultado || '(sem resultado)'}

*Gerado por CEO KRAEFEGG M.O. em ${d.gerado_em}*
`;
}
function mkCsv(p) {
  const rows = [['campo', 'valor']].concat(Object.entries(p).map(([k, v]) => [k, String(v ?? '')]));
  return rows.map(r => r.map(escCsv).join(';')).join('\n');
}
function mkXml(p) {
  const inner = Object.entries(p).map(([k, v]) => `  <${k}>${escXml(v)}</${k}>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<demanda>\n${inner}\n</demanda>`;
}
function mkRtf(p) {
  const t = String(p.resultado || p.decisao || '').replace(/\s+/g, ' ');
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil Helvetica;}}\\f0\\fs22 ${escRtf(t)} }`;
}
function mkPdf(p) {
  const texto = `KRAEFEGG M.O. - ${p.codigo} ${p.titulo}\nVeredito: ${p.veredito} ${p.decisao}\nAlvos: ${p.alvos}\n\n${p.resultado}`;
  const linhas = String(texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const paginas = [];
  let buf = [], y = 800;
  for (const l of linhas) {
    if (y < 44) { paginas.push(buf); buf = []; y = 800; }
    buf.push(`BT /F1 9 Tf 40 ${y} Td (${escPdfTxt(l)}) Tj ET`);
    y -= 12;
  }
  if (buf.length) paginas.push(buf);
  const objs = [];
  const add = body => { objs.push(`${objs.length + 1} 0 obj\n${body}\nendobj`); return objs.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  const pagObj = 2;
  add('<< /Type /Pages /Kids [] /Count 0 >>');
  const fontObj = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const refs = [];
  for (const pg of paginas) {
    const cont = pg.join('\n');
    const contNum = add(`<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`);
    add(`<< /Type /Page /Parent ${pagObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contNum} 0 R >>`);
    refs.push(objs.length);
  }
  objs[pagObj - 1] = `${pagObj} 0 obj\n<< /Type /Pages /Kids [ ${refs.map(r => `${r} 0 R`).join(' ')} ] /Count ${refs.length} >>\nendobj`;
  let blob = '%PDF-1.4\n', offs = [0];
  for (const o of objs) { offs.push(blob.length); blob += o + '\n'; }
  const xs = blob.length;
  blob += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  blob += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xs}\n%%EOF`;
  return Buffer.from(blob, 'latin1');
}

// Publica o pacote exportavel de cada demanda no Drive (06-Entregas/exportables)
async function nodeExportables(s) {
  await setFase(s.codigo, 'concluida', 98, 'Gerando exportables multiformato (md, json, csv, xml, txt, PDF, RTF)...');
  const raiz = `CEO - Demandas HQ/Demanda-${s.codigo}`;
  const dir = join('/app/out', s.codigo, 'exportables');
  mkdirSync(dir, { recursive: true });
  const p = pacoteExportables(s);
  writeFileSync(join(dir, 'resumo.md'), mkMarkdown(p), 'utf8');
  writeFileSync(join(dir, 'resumo.json'), JSON.stringify(p, null, 2), 'utf8');
  writeFileSync(join(dir, 'resumo.csv'), mkCsv(p), 'utf8');
  writeFileSync(join(dir, 'resumo.xml'), mkXml(p), 'utf8');
  writeFileSync(join(dir, 'resumo.txt'), mkMarkdown(p), 'utf8');
  writeFileSync(join(dir, 'resumo.rtf'), mkRtf(p), 'latin1');
  writeFileSync(join(dir, 'resumo.pdf'), mkPdf(p));
  const rel = `${raiz}/06-Entregas/exportables`;
  const publicados = [];
  for (const f of readdirSync(dir)) {
    const local = join(dir, f);
    try { await driveUpload(local, `${rel}/${f}`); publicados.push(`${f}(${statSync(local).size}B)`); } catch (e) { log(`upload ${f}: ${e.message}`); }
  }
  await setFase(s.codigo, 'concluida', 100, `EXPORTABLES publicados (${publicados.length}/${readdirSync(dir).length}) | ${rel}`);
  return {};
}

const grafo = new StateGraph(State)
  .addNode('n_estrutura', nodeCEO_Estrutura)
  .addNode('n_conselho', nodeConselho)
  .addNode('n_decide', nodeCEO_Decide)
  .addNode('n_despacho', nodeDespacho)
  .addNode('n_resultado', nodeResultado)
  .addNode('n_exportables', nodeExportables)
  .addEdge(START, 'n_estrutura')
  .addEdge('n_estrutura', 'n_conselho')
  .addEdge('n_conselho', 'n_decide')
  .addEdge('n_decide', 'n_despacho')
  .addEdge('n_despacho', 'n_resultado')
  .addEdge('n_resultado', 'n_exportables')
  .addEdge('n_exportables', END)
  .compile();

// ---------- Executa uma demanda ----------
async function executar(codigo) {
  if (!codigo || EM_EXECUCAO.has(codigo)) return null;
  EM_EXECUCAO.add(codigo);
  try {
    const d = await getDemanda(codigo);
    if (!d) throw new Error('demanda nao encontrada');
    const ideia = String(d.descricao || d.titulo || '').replace(/^\[IDEIA DIRETOR\]\s*/i, '').trim();
    // Política: toda demanda (backlog/análise) ganha pasta no Drive com verificação,
    // mesmo em revisão. Marcador [ESTRATEGICO] sinaliza ao orquestrador tecnico (job)
    // que esta demanda ja esta sendo conduzida pela equipe estrategica na nuvem.
    await appendLog(d.codigo, '[ESTRATEGICO] despacho da equipe estrategica (cloud OpenRouter)');
    const raizPasta = `CEO - Demandas HQ/Demanda-${d.codigo}`;
    const liga = await garantirPastaDrive(raizPasta);
    if (liga && liga.erro) await appendLog(d.codigo, `AVISO Drive: ${liga.erro}`);
    else await appendLog(d.codigo, `PASTA DRIVE: ${liga || raizPasta}`);
    const st = await grafo.invoke({ codigo: d.codigo, titulo: d.titulo, ideia: ideia || d.titulo });
    return st;
  } finally {
    EM_EXECUCAO.delete(codigo);
  }
}

// Aplica a execucao a TODAS as demandas pendentes (analise OU backlog), sem
// depender de acao manual: cada uma entra no fluxo da equipe estrategica em nuvem.
async function processarTodasPendentes() {
  const r = await supabaseJson(`${API_BASE}/demandas?or=(fase.eq.analise,fase.eq.backlog)&select=codigo,titulo,fase,descricao&order=id.asc&limit=50`, { headers: hdrs });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const arr = await r.json();
  const pendentes = (Array.isArray(arr) ? arr : []).filter(d =>
    d && d.codigo && !EM_EXECUCAO.has(d.codigo) && !String(d.descricao || '').includes('[ESTRATEGICO]'));
  const despachadas = [];
  for (const d of pendentes) {
    despachadas.push(d.codigo);
    executar(d.codigo).catch(async e => {
      log(`falha ${d.codigo}: ${e.message}`);
      try { await setFase(d.codigo, 'falha', 40, `Falha: ${e.message}`); } catch (_) {}
    });
  }
  return { despachadas, total: pendentes.length };
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
// ---------- Camada de seguranca: CORS restrito + rate-limit + headers ----------
function corsOrigem(req) {
  const origem = (req.headers.origin || '').trim();
  if (!origem) return null; // nao-browser (curl/cron/servidor) -> autenticacao via token
  if (CORS_ALLOWED.includes(origem)) return origem;
  return null; // origem nao autorizada -> bloqueada no navegador
}
const CONTADORES = new Map();
function rateCheck(req, chave, limite) {
  const ip = ipDe(req);
  const k = `${ip}|${chave}`;
  const agora = Date.now();
  const c = CONTADORES.get(k);
  if (CONTADORES.size > 20000) CONTADORES.clear();
  if (!c || agora - c.t0 > RATE.janela) { CONTADORES.set(k, { t0: agora, n: 1 }); return { ok: true, retry: 0 }; }
  if (c.n >= limite) return { ok: false, retry: Math.ceil((c.t0 + RATE.janela - agora) / 1000) };
  c.n++;
  CONTADORES.set(k, c);
  return { ok: true, retry: 0 };
}
function json(res, code, obj, req) {
  const origem = req ? corsOrigem(req) : null;
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
  };
  if (origem) h['Access-Control-Allow-Origin'] = origem; // so reflete origem autorizada
  res.writeHead(code, h);
  res.end(JSON.stringify(obj));
}

// ---------- Defesa ativa: deteccao + bloqueio automatico de atacantes ----------
// Escopo ESTRITAMENTE DEFENSIVO: neutraliza o atacante NA FRONTEIRA (ban por IP,
// rejeicao de payloads/sondas maliciosas). Nunca "responde fogo" (nada contra terceiros).
const SEG = {
  janela: 60_000,
  maxFalhas: 8,          // 8 x 401/403 em 60s -> ban (forca bruta / origem proibida)
  maxRotas: 15,          // 15 rotas inexistentes em 60s -> ban (varredura/reconhecimento)
  banBaseMs: 30 * 60_000,
  banMaxMs: 24 * 3600 * 1000,
  eventos: [],
  maxEventos: 150,
  falhas: new Map(),     // ip -> {t0,n}
  rotas: new Map(),      // ip -> {t0,n}
  bans: new Map()        // ip -> {fim, motivo, n}
};
function ipRaw(req) { return String(req.socket.remoteAddress || '').replace(/^::ffff:/, ''); }
function ipDe(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (xff && xff !== 'unknown') ? xff : ipRaw(req);
}
// Apenas IPs publicos sao banidos: chamadas internas (cron/job/CE) nunca sofrem ban.
function ehPublico(ip) {
  if (!ip || ip === '0.0.0.0') return false;
  if (/^(10\.|192\.168\.|127\.|169\.254\.|0\.|::1$)/.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^f[cd][0-9a-f]{2}:|^fe[89ab][0-9a-f]:/i.test(ip)) return false;
  return true;
}
function segLog(kind, ip, detalhe) {
  SEG.eventos.push({ at: new Date().toISOString(), tipo: kind, ip, detalhe: String(detalhe || '').slice(0, 200) });
  if (SEG.eventos.length > SEG.maxEventos) SEG.eventos.shift();
  console.log(`[SEG] ${kind} ${ip} ${detalhe}`);
}
function segBloquear(ip, motivo) {
  const atual = SEG.bans.get(ip);
  const n = (atual ? atual.n : 0) + 1;
  const dur = Math.min(SEG.banMaxMs, SEG.banBaseMs * Math.pow(2, Math.min(n - 1, 5)));
  SEG.bans.set(ip, { fim: Date.now() + dur, motivo, n });
  segLog('ban', ip, `${motivo} (#${n}, +${Math.round(dur / 60000)}min)`);
}
function segFalha(req, tipo) {
  const ip = ipDe(req);
  if (!ehPublico(ip)) return;
  const m = tipo === 'rotas' ? SEG.rotas : SEG.falhas;
  const agora = Date.now();
  const c = m.get(ip);
  if (!c || agora - c.t0 > SEG.janela) { m.set(ip, { t0: agora, n: 1 }); return; }
  c.n++;
  const lim = tipo === 'rotas' ? SEG.maxRotas : SEG.maxFalhas;
  if (c.n >= lim) { m.delete(ip); segBloquear(ip, tipo === 'rotas' ? 'varredura_de_rotas' : 'falhas_repetidas'); }
  else m.set(ip, c);
}
function segBanido(ip) {
  const b = SEG.bans.get(ip);
  if (!b) return false;
  if (Date.now() >= b.fim) { SEG.bans.delete(ip); return false; }
  return true;
}
// Sinais conhecidos de sondagem/exploracao (URL path + query). Ban imediato.
function sinalAtaque(url) {
  let alvo = '';
  try { alvo = decodeURIComponent(url.pathname + url.search); } catch { alvo = url.pathname + url.search; }
  const t = alvo.toLowerCase();
  if (/(?:^|\/)(?:admin|wp-admin|\.env(?:$|[?/])|\.git(?:\/|$)|server-status|actuator|phpmyadmin|\.aws|id_rsa|shell\.php|cmd\.exe)(?:$|[/?.=])/.test(t)) return 'sonda_admin';
  if (/(?:\.\.(?:\/|%2f|\\|%5c)|%00)/.test(alvo)) return 'path_traversal';
  if (/(?:union\s+select|'.{0,4}or\s+1\s*=\s*1|--\s*$)/i.test(t)) return 'sql_injection';
  if (/(?:<script|<\/script|javascript:|onerror=|onload=|document\.cookie|eval\s*\(|\$\{|base64,)/i.test(t)) return 'injecao_script';
  if (/(?:\|?\s*(?:cat|ls|whoami|env|sh)\b|`[^`]*;|\$\()/i.test(t)) return 'cmd_injection';
  return null;
}
// Corpo de POST/PATCH: conteudo de website/malicioso (XSS armazenado, SQLi) -> rejeita ANTES de gravar.
function corpoRisco(str) {
  if (!str) return false;
  return /(?:<script|<\/script|<iframe|<object|javascript:|onerror=|onload=|onclick=|document\.cookie|union\s+select|\bor\s+1\s*=\s*1\b)/i.test(str);
}
const LIMPEZA_SEG = setInterval(() => {
  const agora = Date.now();
  for (const [ip, b] of SEG.bans) if (agora >= b.fim) SEG.bans.delete(ip);
  for (const m of [SEG.falhas, SEG.rotas]) for (const [ip, c] of m) if (agora - c.t0 > SEG.janela) m.delete(ip);
}, 60_000);
if (LIMPEZA_SEG.unref) LIMPEZA_SEG.unref();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const u = url.pathname;

  // Fronteira: IP banido -> 403 (sem rotulo/retry); sonda maliciosa -> sinal + 403.
  // Excecao: POST /security/unban continua acessivel ao DONO (exige token HQ valido)
  // para permitir liberacao pos-incidente; sem token ninguem usa esse caminho.
  const ipCliente = ipDe(req);
  const eUnban = req.method === 'POST' && u === '/security/unban';
  if (!eUnban && segBanido(ipCliente)) {
    segLog('bloqueado', ipCliente, `${req.method} ${u}`);
    return json(res, 403, { erro: 'acesso restrito' }, req);
  }
  const sinal = sinalAtaque(url);
  if (sinal) {
    segFalha(req, 'sinal_' + sinal);
    segLog('ataque', ipCliente, `${req.method} ${u} [${sinal}]`);
    return json(res, 403, { erro: 'acesso restrito' }, req);
  }

  // Preflight CORS: so autoriza origens da lista (navegador). Sem Origin (curl) -> 204 neutro.
  if (req.method === 'OPTIONS') {
    const origem = corsOrigem(req);
    const h = {
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token',
      'Access-Control-Max-Age': '86400'
    };
    if (origem) h['Access-Control-Allow-Origin'] = origem;
    if (req.headers.origin && !origem) { segFalha(req, 'origem_nao_autorizada'); res.writeHead(403, Object.assign({ 'Content-Type': 'application/json' }, h)); return res.end(JSON.stringify({ erro: 'origem nao autorizada' })); }
    res.writeHead(204, h);
    return res.end();
  }

  const auth = req.headers['x-hq-token'];
  // Fail-safe: servidor sem HQ_ACCESS_TOKEN configurado nega TUDO (mutacoes/leitura)
  if (!ACCESS) return json(res, 503, { erro: 'acesso nao configurado (HQ_ACCESS_TOKEN ausente)' }, req);

  const autorizado = fn => {
    if (auth !== ACCESS) { segFalha(req, 'auth'); return json(res, 401, { erro: 'acesso negado' }, req); }
    return fn();
  };
  const filaRate = (limite) => {
    const r = rateCheck(req, limite);
    if (!r.ok) { segFalha(req, 'excesso_rate'); return json(res, 429, { erro: 'muitas requisicoes', retry_apos: r.retry }, req); }
    return false;
  };

  // GET /health (publico, leve) — checa dependencias criticas: Supabase, Drive, modelo
  if (req.method === 'GET' && (u === '/health' || u === '/')) {
    if (filaRate('health', 60)) return;
    try {
      const supabaseOk = await supabaseJson(`${API_BASE}/demandas?select=codigo&limit=1`, { headers: hdrs }, { tentativas: 1 }).then(r => r.ok).catch(() => false);
      let driveOk = false;
      try { await driveRun(['lsd', `${DRIVE_REMOTE}:/CEO - Demandas HQ`], 15000); driveOk = true; } catch {}
      return json(res, 200, { ok: supabaseOk && driveOk, servico: 'ce-strategic', supabase: supabaseOk ? 'ok' : 'erro', drive: driveOk ? 'ok' : 'erro', modelo: OR_KEY ? 'ok' : 'erro' }, req);
    } catch (e) { return json(res, 200, { ok: false, servico: 'ce-strategic', erro: e.message }, req); }
  }

  // POST /demanda  -> cria e dispara a demanda estrategica (aciona CEO/Conselho na nuvem)
  if (req.method === 'POST' && u === '/demanda') {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      try {
        const body = JSON.parse((await readBody(req)) || '{}');
        const ideia = String(body.ideia || '').trim();
        if (corpoRisco(ideia)) { segFalha(req, 'payload_malicioso'); return json(res, 400, { erro: 'conteudo rejeitado' }, req); }
        if (!ideia) return json(res, 400, { erro: 'campo ideia obrigatorio' }, req);
        const codigo = String(body.codigo || 'S-' + Date.now().toString(36).toUpperCase());
        let rec;
        try { rec = await getDemanda(codigo); } catch { rec = null; }
        if (!rec) await criarDemanda({ codigo, titulo: body.titulo || ideia.slice(0, 60), ideia, prioridade: body.prioridade });
        executar(codigo).catch(e => { log(`falha ${codigo}: ${e.message}`); setFase(codigo, 'falha', 40, `Falha: ${e.message}`).catch(() => {}); });
        return json(res, 202, { codigo, status: 'em_processamento', msg: 'demanda despachada ao CEO e conselho' }, req);
      } catch (e) { log('erro POST /demanda', e); return json(res, 500, { erro: e.message }, req); }
    });
  }

  // POST /processar -> lote de todas as pendentes. Token: header, ?token=, corpo/cloud-event.
  if (req.method === 'POST' && u === '/processar') {
    if (filaRate('processar', RATE.limiteProcessar)) return;
    return (async () => {
      let corpo = {};
      try { corpo = JSON.parse((await readBody(req)) || '{}'); } catch { corpo = {}; }
      const embrulho = corpo && typeof corpo === 'object' && corpo.data && typeof corpo.data === 'object' ? corpo.data : corpo;
      const tk = auth || url.searchParams.get('token') || corpo.autorizado || corpo.token || embrulho.autorizado || embrulho.token || '';
      if (tk !== ACCESS) { segFalha(req, 'auth'); return json(res, 401, { erro: 'acesso negado' }, req); }
      try {
        const r = await processarTodasPendentes();
        return json(res, 202, { msg: r.despachadas.length ? 'agentes acionados na nuvem' : 'sem novas demandas pendentes', despachadas: r.despachadas, total: r.total }, req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    })();
  }

  // GET /demanda/:codigo -> status
  const m = u.match(/^\/demanda\/([^/]+)$/);
  if (req.method === 'GET' && m) {
    if (filaRate('geral', RATE.limiteGeral)) return;
    return autorizado(async () => {
      try {
        const d = await getDemanda(m[1]);
        if (!d) return json(res, 404, { erro: 'nao encontrada' }, req);
        return json(res, 200, { codigo: d.codigo, titulo: d.titulo, fase: d.fase, progresso: d.progresso, log: d.descricao || '' }, req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    });
  }

  // GET /demandas -> lista com select/permissao de campos (whitelist; sem '*')
  if (req.method === 'GET' && u === '/demandas') {
    if (filaRate('geral', RATE.limiteGeral)) return;
    return autorizado(async () => {
      try {
        const sel = String(url.searchParams.get('select') || 'codigo,titulo,fase,prioridade,progresso,responsavel,criado_em,atualizado_em').split(',').map(s => s.trim()).filter(s => DEMANDA_CAMPOS.has(s));
        if (!sel.length) sel.push('codigo');
        const order = String(url.searchParams.get('order') || 'id.asc');
        const lim = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
        const r = await supabaseJson(`${API_BASE}/demandas?select=${sel.join(',')}&order=${sel.includes('id') || /^[a-z_]+\.(asc|desc)$/.test(order) ? order : 'id.asc'}&limit=${lim}`, { headers: hdrs });
        if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
        const arr = await r.json();
        return json(res, 200, Array.isArray(arr) ? arr : [], req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    });
  }

  // POST /demandas -> cria registro (portal) — campos restritos a whitelist; 409 se codigo existir
  if (req.method === 'POST' && u === '/demandas') {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      try {
        const bruto = (await readBody(req)) || '{}';
        if (corpoRisco(bruto)) { segFalha(req, 'payload_malicioso'); return json(res, 400, { erro: 'conteudo rejeitado' }, req); }
        const body = JSON.parse(bruto);
        const rec = {};
        for (const k of Object.keys(body)) if (DEMANDA_CAMPOS.has(k)) rec[k] = body[k];
        if (!rec.codigo || !rec.titulo) return json(res, 400, { erro: 'campos codigo e titulo obrigatorios' }, req);
        const existe = await supabaseJson(`${API_BASE}/demandas?codigo=eq.${encodeURIComponent(rec.codigo)}&select=id`, { headers: hdrs }, { tentativas: 1 });
        const ja = existe.ok ? (await existe.json()) : [];
        if (Array.isArray(ja) && ja.length) return json(res, 409, { erro: 'codigo ja existe' }, req);
        const r = await supabaseJson(`${API_BASE}/demandas`, { method: 'POST', headers: hdrs, body: JSON.stringify(rec) }, { origem: 'criacao' });
        if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
        const created = await r.json().catch(() => rec);
        return json(res, 201, Array.isArray(created) ? created[0] : created, req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    });
  }

  // PATCH /demandas/:codigo -> atualiza (campos restritos)
  const pm = u.match(/^\/demandas\/([^/]+)$/);
  if (req.method === 'PATCH' && pm) {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      try {
        const brutoPatch = (await readBody(req)) || '{}';
        if (corpoRisco(brutoPatch)) { segFalha(req, 'payload_malicioso'); return json(res, 400, { erro: 'conteudo rejeitado' }, req); }
        const body = JSON.parse(brutoPatch);
        const up = {};
        for (const k of Object.keys(body)) if (DEMANDA_CAMPOS.has(k) && k !== 'codigo') up[k] = body[k];
        if (!Object.keys(up).length) return json(res, 400, { erro: 'sem campos validos' }, req);
        const r = await supabaseJson(`${API_BASE}/demandas?codigo=eq.${encodeURIComponent(pm[1])}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(up) }, { origem: 'atualizacao' });
        if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
        return json(res, 200, { ok: true, codigo: pm[1] }, req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    });
  }

  // DELETE /demandas/:codigo
  if (req.method === 'DELETE' && pm) {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      try {
        const r = await supabaseJson(`${API_BASE}/demandas?codigo=eq.${encodeURIComponent(pm[1])}`, { method: 'DELETE', headers: hdrs }, { origem: 'exclusao' });
        if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
        return json(res, 200, { ok: true, codigo: pm[1] }, req);
      } catch (e) { return json(res, 500, { erro: e.message }, req); }
    });
  }

  // Defesa: painel de controle — bans ativos, evento recente (requer token).
  if (req.method === 'GET' && u === '/security') {
    if (filaRate('geral', RATE.limiteGeral)) return;
    return autorizado(async () => {
      const agora = Date.now();
      return json(res, 200, {
        agora: new Date(agora).toISOString(),
        bans: [...SEG.bans.entries()].map(([ip, b]) => ({ ip, motivo: b.motivo, n: b.n, expira_em: new Date(b.fim).toISOString(), resta_s: Math.max(0, Math.ceil((b.fim - agora) / 1000)) })),
        eventos: SEG.eventos.slice(-40),
        alertas: { falhas_60s: SEG.falhas.size, varredura_60s: SEG.rotas.size }
      }, req);
    });
  }
  if (req.method === 'POST' && u === '/security/ban') {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      const body = JSON.parse((await readBody(req)) || '{}');
      const ip = String(body.ip || '').trim();
      if (!ip) return json(res, 400, { erro: 'campo ip obrigatorio' }, req);
      segBloquear(ip, 'banimento_manual');
      return json(res, 200, { ok: true, ip }, req);
    });
  }
  if (req.method === 'POST' && u === '/security/unban') {
    if (filaRate('mut', RATE.limiteMutacao)) return;
    return autorizado(async () => {
      const body = JSON.parse((await readBody(req)) || '{}');
      const ip = String(body.ip || '').trim();
      SEG.bans.delete(ip);
      SEG.falhas.delete(ip);
      SEG.rotas.delete(ip);
      segLog('unban', ip, 'liberado manualmente');
      return json(res, 200, { ok: true }, req);
    });
  }

  return segFalha(req, 'rotas'), json(res, 404, { erro: 'rota nao encontrada' }, req);
});

server.listen(PORT, () => log(`CE-STRATEGIC ouvindo na porta ${PORT}`));

