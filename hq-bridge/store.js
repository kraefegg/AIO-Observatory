// store.js — armazenamento em memória das tarefas orquestradas no HQ Bridge.
// Local-first: perde dados ao reiniciar (aceitável para teste/PoC).
'use strict';

const TAREFAS = new Map();
let seq = 0;

function novoId() {
  seq += 1;
  return 'hq_' + Date.now().toString(36) + '_' + seq;
}

// status: 'pendente' | 'processando' | 'concluida' | 'erro'
function criar(titulo, responsavel, area, prompt) {
  const id = novoId();
  const agora = new Date().toISOString();
  const t = {
    id,
    titulo,
    responsavel,
    area,
    prompt,
    status: 'pendente',
    tarefa: id,
    criadaEm: agora,
    atualizadaEm: agora,
    resultado: '',
    error: '',
    eventoHistorico: []
  };
  TAREFAS.set(id, t);
  return t;
}

function obter(id) {
  return TAREFAS.get(id) || null;
}

function atualizar(id, campos) {
  const t = TAREFAS.get(id);
  if (!t) return null;
  Object.assign(t, campos, { atualizadaEm: new Date().toISOString() });
  return t;
}

function ponderEvento(id, texto, cor) {
  const t = TAREFAS.get(id);
  if (!t) return;
  if (!Array.isArray(t.eventoHistorico)) t.eventoHistorico = [];
  t.eventoHistorico.unshift({ texto, cor, em: new Date().toISOString() });
  if (t.eventoHistorico.length > 50) t.eventoHistorico.length = 50;
  t.atualizadaEm = new Date().toISOString();
}

function listar(limite) {
  const arr = Array.from(TAREFAS.values());
  arr.sort((a, b) => (a.criadaEm < b.criadaEm ? 1 : -1));
  return arr.slice(0, limite || 50);
}

module.exports = { criar, obter, atualizar, ponderEvento, listar };
