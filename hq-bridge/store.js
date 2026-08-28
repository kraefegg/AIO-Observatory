// store.js — armazenamento das demandas orquestradas no HQ Bridge.
//
// Estratégia: cache em memória síncrona (compatível com o roteador server.js,
// que chama as funções de forma síncrona) + persistência assíncrona em segundo
// plano no MongoDB Atlas. Tudo é gravado de forma difusa (fire-and-forget),
// então a API continua síncrona e o servidor não bloqueia.
//
// Se o MongoDB não estiver configurado/disponível, degrada para memória local
// (equivalente ao comportamento anterior de PoC), sem quebrar o servidor.
'use strict';

const config = require('./config');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');

// ---- estado em memória ----
const TAREFAS = new Map();   // demandas/tarefas
const seq = { v: 0 };

// ---- conexão Mongo (lazy, reutilizada) ----
let _cliente = null;
let _db = null;
let _falhouUmaVez = false;

// A rede do cliente não resolve DNS TXT, então o formato mongodb+srv:// falha.
// Por isso conectamos com directConnection=true ao(s) host(s) direto(s) do Atas,
// detectando o primário. Se MONGO_URI for fornecida, ela tem precedência.
function montarUri(host) {
  if (config.MONGO_URI) return config.MONGO_URI;
  const cred = config.MONGO_USER
    ? encodeURIComponent(config.MONGO_USER) + ':' + encodeURIComponent(config.MONGO_PASS) + '@'
    : '';
  return (
    'mongodb://' + cred + host +
    '/?ssl=true&authSource=admin&directConnection=true&serverSelectionTimeoutMS=8000'
  );
}

function hostsLista() {
  if (config.MONGO_URI) return [];
  return config.MONGO_HOSTS.split(',').map((h) => h.trim()).filter(Boolean);
}

async function conectar() {
  if (_db) return _db;
  const lista = hostsLista();

  // 1) tenta cada host direto; escolhe o que for primário (ou o primeiro que conectar)
  const tentativas = [];
  for (const host of lista) {
    const c = new MongoClient(montarUri(host), {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      appName: 'kraefeggmo-bridge'
    });
    try {
      await c.connect();
      const ism = await c.db('admin').command({ isMaster: 1 });
      if (ism.ismaster) {
        _cliente = c;
        _db = c.db(config.MONGO_DB);
        return _db;
      }
      tentativas.push(c); // não é primário; guarda p/ fechar depois
      await c.close();
    } catch (e) {
      try { await c.close(); } catch (e2) {}
    }
  }
  // 2) fallback: se nenhum primário encontrado e a lista era vazia mas MONGO_URI existe
  if (config.MONGO_URI) {
    const c = new MongoClient(config.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      appName: 'kraefeggmo-bridge'
    });
    try {
      await c.connect();
      _cliente = c;
      _db = c.db(config.MONGO_DB);
      return _db;
    } catch (e) {
      try { await c.close(); } catch (e2) {}
    }
  }
  _falhouUmaVez = true;
  throw new Error('MongoDB indisponível (sem primário acessível)');
}

function statusMongo() {
  return { conectado: !!_db, falhou: _falhouUmaVez };
}

// grava de forma assíncrona e segura (nunca lança no caller)
function gravar(colecao, doc) {
  conectar()
    .then((db) => db.collection(colecao).replaceOne({ _id: doc._id }, doc, { upsert: true }))
    .catch(() => {
      // se falhou por indisponibilidade, tenta reconectar na próxima
      _cliente = null; _db = null;
    });
}

function novoId() {
  seq.v += 1;
  return 'hq_' + Date.now().toString(36) + '_' + seq.v;
}

function baseDoc() {
  return {
    _id: novoId(),
    criadaEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString()
  };
}

// ---- Demandas (tarefas) — API original do store ----
// status: 'pendente' | 'processando' | 'concluida' | 'erro'
function criar(titulo, responsavel, area, prompt) {
  const t = Object.assign(baseDoc(), {
    tipo: 'demanda',
    id: undefined, // usaremos _id como id; id derivado
    titulo,
    responsavel,
    area,
    prompt,
    status: 'pendente',
    resultado: '',
    error: '',
    eventoHistorico: []
  });
  t.id = t._id;
  TAREFAS.set(t.id, t);
  gravar('demandas', t);
  return limparSaida(t);
}

function obter(id) {
  const t = TAREFAS.get(id);
  return t ? limparSaida(t) : null;
}

function atualizar(id, campos) {
  const t = TAREFAS.get(id);
  if (!t) return null;
  Object.assign(t, campos, { atualizadaEm: new Date().toISOString() });
  gravar('demandas', t);
  return limparSaida(t);
}

function ponderEvento(id, texto, cor) {
  const t = TAREFAS.get(id);
  if (!t) return;
  if (!Array.isArray(t.eventoHistorico)) t.eventoHistorico = [];
  t.eventoHistorico.unshift({ texto, cor, em: new Date().toISOString() });
  if (t.eventoHistorico.length > 50) t.eventoHistorico.length = 50;
  t.atualizadaEm = new Date().toISOString();
  gravar('demandas', t);
}

function listar(limite) {
  const arr = Array.from(TAREFAS.values()).map(limparSaida);
  arr.sort((a, b) => (a.criadaEm < b.criadaEm ? 1 : -1));
  return arr.slice(0, limite || 50);
}

// remove o _id interno (Mongo) da saída JSON; mantém o id textual da HQ
function limparSaida(t) {
  if (!t) return t;
  const o = Object.assign({}, t);
  delete o._id;
  return o;
}

// ---- Projetos e Relatórios (persistência de longo prazo) ----
async function criarProjeto(nome, dono, descricao, meta) {
  const doc = Object.assign(baseDoc(), {
    tipo: 'projeto',
    nome,
    dono: dono || '',
    descricao: descricao || '',
    meta: meta || {},
    status: 'ativo',
    relatorios: [],
    tags: []
  });
  const db = await conectar();
  const r = await db.collection('projetos').insertOne(doc);
  doc.id = doc._id.toString();
  return Object.assign({}, doc, { id: r.insertedId.toString() });
}

async function listarProjetos() {
  const db = await conectar();
  const arr = await db.collection('projetos').find().sort({ criadaEm: -1 }).limit(200).toArray();
  return arr.map((d) => { d.id = d._id.toString(); delete d._id; return d; });
}

async function criarRelatorio(projetoId, agente, titulo, conteudo, status) {
  const doc = Object.assign(baseDoc(), {
    tipo: 'relatorio',
    projetoId,
    agente: agente || '',
    titulo,
    conteudo,
    status: status || 'rascunho',
    tags: []
  });
  const db = await conectar();
  const r = await db.collection('relatorios').insertOne(doc);
  if (projetoId) {
    await db.collection('projetos').updateOne(
      { _id: projetoId },
      { $inc: { 'meta.numRelatorios': 1 }, $set: { atualizadaEm: new Date().toISOString() } }
    );
  }
  return Object.assign({}, doc, { id: r.insertedId.toString() });
}

async function listarRelatorios(projetoId) {
  const db = await conectar();
  const filtro = projetoId ? { projetoId } : {};
  const arr = await db.collection('relatorios').find(filtro).sort({ criadaEm: -1 }).limit(300).toArray();
  return arr.map((d) => { d.id = d._id.toString(); delete d._id; return d; });
}

module.exports = {
  criar,
  obter,
  atualizar,
  ponderEvento,
  listar,
  criarProjeto,
  listarProjetos,
  criarRelatorio,
  listarRelatorios,
  montarUri,
  statusMongo,
  conectar
};
