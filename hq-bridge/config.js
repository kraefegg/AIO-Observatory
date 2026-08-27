// config.js — leitura de configuração do HQ Bridge (OmniRoute)
// Carrega de variáveis de ambiente com fallback para .env (sem dependências externas).
'use strict';

const fs = require('fs');
const path = require('path');

function carregarEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const linhas = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/);
  for (const linha of linhas) {
    const t = linha.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const chave = t.slice(0, i).trim();
    const valor = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[chave] === undefined) process.env[chave] = valor;
  }
}

carregarEnv();

const PORT = parseInt(process.env.PORT || '4173', 10);

// URL base do OmniRoute (endpoint OpenAI-compatível). Padrão: local.
const OMNI_URL = (process.env.OMNI_URL || 'http://localhost:20128').replace(/\/+$/, '');
const OMNI_API_KEY = process.env.OMNI_API_KEY || '';      // chave do OmniRoute (Bearer) se exigida
const OMNI_MODEL = process.env.OMNI_MODEL || '';          // modelo/rota/target (ex.: auto/... via combos)
const OMNI_CHAT_PATH = process.env.OMNI_CHAT_PATH || '/v1/chat/completions';
const OMNI_TIMEOUT_MS = parseInt(process.env.OMNI_TIMEOUT_MS || '120000', 10);

// Tokens para proteger o front (envie via header X-HQ-TOKEN nos testes locais).
const HQ_TOKEN = process.env.HQ_TOKEN || '';

// Prefixo de agentes que a HQ usa como rótulos (responsável = "tipo" de agente).
const AGENTS = {
  'Railson Arruda': 'orquestrador',
  'Larissa Vasconcelos': 'estrategista',
  'Caio Menezes': 'dados',
  'Diego Ferreira': 'engenharia'
};

function omniModelFinal() {
  if (OMNI_MODEL) return OMNI_MODEL;
  return 'auto';
}

module.exports = {
  PORT,
  OMNI_URL,
  OMNI_API_KEY,
  OMNI_MODEL: omniModelFinal(),
  OMNI_CHAT_PATH,
  OMNI_TIMEOUT_MS,
  HQ_TOKEN,
  AGENTS
};
