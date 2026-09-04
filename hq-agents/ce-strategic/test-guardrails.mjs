import { Guardrails, checkNoSecrets, parseJSON } from './guardrails.mjs';

let fail = 0;
const log = (name, ok, extra) => {
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
};

const d1 = Guardrails.decisao('{"veredito":"APROVAR","decisao":"ok","foco":"f","alvos":"a","setor_prioritario":"s"}');
log('decisao valida', d1.ok === true, d1.motivo);

const d2 = Guardrails.decisao('{"veredito":"TALVEZ","decisao":"x"}');
log('decisao veredito invalido', d2.ok === false, d2.motivo);

const d3 = Guardrails.decisao('texto sem json');
log('decisao nao-json', d3.ok === false, d3.motivo);

const s1 = checkNoSecrets('use api_key=sk-or-abcdef123 minha chave');
log('segredo detectado', s1.ok === false, s1.motivo);

const s2 = checkNoSecrets('relatorio normal sobre mineracao');
log('sem segredo', s2.ok === true);

const p1 = parseJSON('aqui vai ```json\n{"a":1}\n``` fim');
log('parseJSON fence', p1 && p1.a === 1, JSON.stringify(p1));

const t1 = Guardrails.parecer('texto curto');
log('parecer curto', t1.ok === false, t1.motivo);

const q1 = Guardrails.questao('Uma questao suficientemente longa sobre viabilidade de energia renovavel no nordeste brasileiro para investigacao.');
log('questao valida', q1.ok === true, q1.motivo);

console.log(`\n${fail === 0 ? 'TODOS OS TESTES PASSARAM' : fail + ' TESTE(S) FALHARAM'}`);
process.exit(fail === 0 ? 0 : 1);
