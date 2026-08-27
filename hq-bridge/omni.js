// omni.js — cliente OmniRoute (endpoint OpenAI-compatível /v1/chat/completions).
// Usa fetch nativo do Node 18+; sem dependências externas.
'use strict';

const config = require('./config');

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (config.OMNI_API_KEY) h['Authorization'] = 'Bearer ' + config.OMNI_API_KEY;
  return h;
}

// GET /v1/models — verifica se o OmniRoute está de pé e lista modelos.
async function listarModelos() {
  const res = await fetch(config.OMNI_URL + '/v1/models', { headers: headers(), signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error('OmniRoute /models HTTP ' + res.status);
  const data = await res.json();
  return (data.data || []).map((m) => m.id);
}

// Dispara uma geração (chat completion) através do OmniRoute.
// `model` pode ser um modelo específico ou um target/rota (ex. "auto/..." para usar combos).
async function gerar({ model, prompt, system }) {
  const body = {
    model: model || config.OMNI_MODEL,
    stream: false,
    messages: []
  };
  if (system) body.messages.push({ role: 'system', content: system });
  body.messages.push({ role: 'user', content: prompt });
  if (config.OMNI_TIMEOUT_MS) body.max_tokens = Math.min(4096, 4096);

  const res = await fetch(config.OMNI_URL + config.OMNI_CHAT_PATH, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.OMNI_TIMEOUT_MS)
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error('OmniRoute chat HTTP ' + res.status + ': ' + texto.slice(0, 300));
  }
  const data = await res.json();
  const escolha = Array.isArray(data.choices) && data.choices[0];
  const conteudo = escolha && escolha.message ? (escolha.message.content || '') : '';
  const modeloUsado = data.model || (escolha && escolha.model) || body.model || null;
  return { conteudo, modeloUsado };
}

module.exports = { listarModelos, gerar, headers };
