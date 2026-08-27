// server.js — HQ Bridge (OmniRoute): mini-backend que liga o corporate-hq.html
// a um orquestrador multiagente via OmniRoute local.
//
// Rotas (todas sob /api/hq):
//   GET  /api/hq/health        → estado do bridge + OmniRoute + modelos disponíveis
//   POST /api/hq/task          → cria uma tarefa e dispara processamento assíncrono
//   GET  /api/hq/task/:id      → consulta status/resultado (polling)
//   GET  /api/hq/tasks         → lista tarefas recentes
//
// Node puro (http + fetch nativo), sem dependências externas.
// Execute:  node server.js   (default porta 4173; use PORT=... para mudar)
'use strict';

const http = require('http');
const config = require('./config');
const store = require('./store');
const omni = require('./omni');

const { PORT, OMNI_URL, AGENTS } = config;

// ---- CORS: libera o GitHub Pages do projeto e o localhost (arquivo aberto) ----
const ORIGENS = [
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://kraefegg.github.io',
  'null'
];
const CHAVE_TOKEN = config.HQ_TOKEN;

function corsOk(origem) {
  if (!origem || origem === 'null') return true;
  if (ORIGENS.some((o) => o && origem.startsWith(o))) return true;
  return origem.startsWith('http://localhost') || origem.startsWith('http://127.0.0.1');
}

function enviar(res, status, obj, origem) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origem === 'null' ? '*' : origem || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 250000) { req.destroy(); reject(new Error('corpo grande demais')); }
    });
    req.on('end', () => {
      try { resolve(dados ? JSON.parse(dados) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function rotaPara(responsavel, titulo) {
  // Heurística simples: mapeia o responsável (rótulo da HQ) para um prompt de papel.
  const tipo = AGENTS[responsavel] || (responsavel || 'agente');
  const área = responsavel ? '' : 'operação';
  const system = [
    'Você é um agente operacional do KRAEFEGG M.O. (orquestração multiagente).',
    'Tipo/rol: ' + tipo + '.',
    'Responda de forma objetiva, em português (pt-BR), com plano, execução e status.',
    'Encerre com uma linha "STATUS: concluído|em_andamento|atenção" e uma "ENTREGA:" curta.'
  ].join('\n');
  return { system, user: 'Tarefa: ' + (titulo || '(sem título)') };
}

function processarTarefa(id) {
  const t = store.obter(id);
  if (!t) return;
  const { system, user } = rotaPara(t.responsavel, t.titulo);
  store.atualizar(id, { status: 'processando' });
  store.ponderEvento(id, 'Agente recebeu a demanda', '#22CCFF');

  omni.gerar({ model: config.OMNI_MODEL, prompt: user, system })
    .then((r) => {
      store.ponderEvento(id, 'Agente retornou resultado', '#2FE39B');
      store.atualizar(id, {
        status: 'concluida',
        resultado: r.conteudo,
        modelo: r.modeloUsado || null,
        error: ''
      });
    })
    .catch((e) => {
      store.ponderEvento(id, 'Falha no agente: ' + (e && e.message ? e.message : 'erro'), '#FF6B6B');
      store.atualizar(id, { status: 'erro', error: (e && e.message) || String(e) });
    });
}

const server = http.createServer(async (req, res) => {
  const origem = req.headers.origin;
  const url = req.url || '/';
  const caminho = url.split('?')[0];
  const partes = caminho.split('/').filter(Boolean); // ['api','hq',...]

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origem === 'null' ? '*' : origem || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-HQ-Token'
    });
    return res.end();
  }

  // admt token opcional via header, idêntico à lógica de CORS (leve).
  const tokenOk = !CHAVE_TOKEN || (req.headers['x-hq-token'] === CHAVE_TOKEN);
  if (!corsOk(origem)) return enviar(res, 403, { ok: false, erro: 'origem não permitida' }, origem);
  if (!tokenOk) return enviar(res, 401, { ok: false, erro: 'token inválido' }, origem);

  if (caminho === '/api/hq/health') {
    try {
      const modelos = await omni.listarModelos();
      return enviar(res, 200, {
        ok: true,
        bridge: 'up',
        omniroute: 'up',
        omniUrl: OMNI_URL,
        modelos: modelos.slice(0, 30),
        model: config.OMNI_MODEL
      }, origem);
    } catch (e) {
      return enviar(res, 200, {
        ok: true,
        bridge: 'up',
        omniroute: 'down',
        omniUrl: OMNI_URL,
        erro: (e && e.message) || String(e)
      }, origem);
    }
  }

  if (caminho === '/api/hq/task' && req.method === 'POST') {
    try {
      const corpo = await lerCorpo(req);
      const titulo = String(corpo.titulo || '').slice(0, 500);
      const responsavel = String(corpo.responsavel || '').slice(0, 120);
      const area = String(corpo.area || '').slice(0, 120);
      const promptCustom = String(corpo.prompt || '').slice(0, 4000);
      if (!titulo) return enviar(res, 400, { ok: false, erro: 'campo "titulo" obrigatório' }, origem);

      const t = store.criar(titulo, responsavel, area, promptCustom);
      store.ponderEvento(t.id, 'Demanda criada e enfileirada', '#FFB44A');
      processarTarefa(t.id); // assíncrono
      return enviar(res, 201, { ok: true, tarefa: t }, origem);
    } catch (e) {
      return enviar(res, 500, { ok: false, erro: (e && e.message) || 'erro ao criar tarefa' }, origem);
    }
  }

  if (caminho === '/api/hq/tasks' && req.method === 'GET') {
    return enviar(res, 200, { ok: true, tarefas: store.listar() }, origem);
  }

  // GET /api/hq/task/:id
  if (partes[0] === 'api' && partes[1] === 'hq' && partes[2] === 'task' && partes[3] && req.method === 'GET') {
    const t = store.obter(partes[3]);
    if (!t) return enviar(res, 404, { ok: false, erro: 'tarefa não encontrada' }, origem);
    return enviar(res, 200, { ok: true, tarefa: t }, origem);
  }

  return enviar(res, 404, { ok: false, erro: 'rota não encontrada' }, origem);
});

server.listen(PORT, () => {
  console.log('HQ Bridge (OmniRoute) escutando em http://localhost:' + PORT);
  console.log('  OmniRoute alvo: ' + OMNI_URL + '  (model: ' + config.OMNI_MODEL + ')');
  console.log('  Health: http://localhost:' + PORT + '/api/hq/health');
});
