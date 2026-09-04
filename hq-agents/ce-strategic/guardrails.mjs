// ============================================================
// GUARDRAILS - validacao de saida dos agentes (patterns CrewAI)
// Aplicados a cada no do LangGraph para garantir qualidade,
// saude dos dados e seguranca (anti-vazamento de chaves).
// ============================================================

// ---------- Seguranca: detecta chaves/segredos no texto ----------
const SECRET_PATTERNS = [
  /(?:api[_-]?key|token|secret|password|senha|chave)\s*[:=]\s*\S+/i,
  /sb_publishable_[a-zA-Z0-9_-]+/,
  /gho_[a-zA-Z0-9]+/,
  /pat_[a-zA-Z0-9]+/,
  /sk-or-[a-zA-Z0-9]+/,
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
];

/**
 * Valida se o texto nao contem segredos.
 * @returns {{ok:boolean, motivo?:string}}
 */
export function checkNoSecrets(texto) {
  const raw = String(texto || '');
  for (const re of SECRET_PATTERNS) {
    const m = raw.match(re);
    if (m) {
      // Ignora ocorrencias no proprio texto de validacao/instrucao
      if (/validar|detectar|exemplo|dummy|placeholder|seu|sua/i.test(m[0])) continue;
      return { ok: false, motivo: `possivel segredo detectado (${re.toString().slice(0, 40)}...)` };
    }
  }
  return { ok: true };
}

// ---------- Parsing JSON resiliente com retry de extração ----------
/**
 * Extrai JSON valido de uma resposta de IA (remove fences/codigo).
 * @returns {object|null}
 */
export function parseJSON(texto) {
  const raw = String(texto || '').trim();
  const candidates = [
    raw,
    raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim(),
    (raw.match(/\{[\s\S]*\}/) || [])[0] || '',
    (raw.match(/\[[\s\S]*\]/) || [])[0] || '',
  ];
  for (const c of candidates) {
    if (!c) continue;
    try { return JSON.parse(c); } catch {}
  }
  return null;
}

// ---------- Validacao de tamanho (task-first: saida nao trivial) ----------
export function checkMinLength(texto, min, rotulo) {
  const len = String(texto || '').trim().length;
  if (len < min) return { ok: false, motivo: `${rotulo} muito curto (${len} chars; minimo ${min})` };
  return { ok: true };
}

// ---------- Validadores por no (retornam {ok, motivo} ou jogam) ----------
export const Guardrails = {
  /**
   * Decisao do CEO: deve conter veredito valido e campos essenciais.
   * Espera structured output JSON (padrao CrewAI output_pydantic).
   */
  decisao: (texto) => {
    const sec = checkNoSecrets(texto);
    if (!sec.ok) return sec;

    const j = parseJSON(texto);
    if (!j) return { ok: false, motivo: 'decisao nao e JSON valido' };

    const v = String(j.veredito || '').toUpperCase();
    if (!['APROVAR', 'MELHORAR', 'REPROPOR'].includes(v)) {
      return { ok: false, motivo: `veredito invalido: ${j.veredito}` };
    }
    if (!String(j.decisao || '').trim()) return { ok: false, motivo: 'campo decisao vazio' };
    return { ok: true, valor: j };
  },

  /**
   * Questao estrategica do CEO: texto objetivo, sem segredo, comprimento minimo.
   */
  questao: (texto) => {
    const sec = checkNoSecrets(texto);
    if (!sec.ok) return sec;
    return checkMinLength(texto, 80, 'questao estrategica');
  },

  /**
   * Parecer do conselheiro: pesquisa substantiva.
   */
  parecer: (texto) => {
    const sec = checkNoSecrets(texto);
    if (!sec.ok) return sec;
    return checkMinLength(texto, 200, 'parecer de conselheiro');
  },

  /**
   * Resultado final: resumo executivo minimo.
   */
  resultado: (texto) => {
    const sec = checkNoSecrets(texto);
    if (!sec.ok) return sec;
    return checkMinLength(texto, 200, 'resultado executivo');
  },
};

/**
 * Wrapper para aplicar um guardrail ao output do `ai()` com retry.
 * Re-usa a funcao de IA para reprocessar ate N vezes quando falhar.
 *
 * @param {Function} aiFn       funcao async (content, opts) -> string
 * @param {string}   content    prompt gerador
 * @param {Function} guardrail  (texto) => {ok, motivo?, valor?}
 * @param {object}   opts       {tokens, maxRetry}
 * @returns {Promise<string>} output validado
 */
export async function aiComGuardrail(aiFn, content, guardrail, opts = {}) {
  const maxRetry = opts.maxRetry ?? 2;
  for (let t = 0; t <= maxRetry; t++) {
    const out = await aiFn(content, opts);
    const r = guardrail(out);
    if (r.ok) return out;
    if (t === maxRetry) {
      console.warn(`[guardrail] reprocessado ${maxRetry}x sem sucesso: ${r.motivo}`);
      return out; // entrega mesmo assim (nao trava o fluxo), logado
    }
    // Feedback ao modelo para corrigir na proxima tentativa
    content = content + `\n\n(Nota de validacao: ${r.motivo}. Corrija e tente novamente.)`;
  }
  return '';
}
