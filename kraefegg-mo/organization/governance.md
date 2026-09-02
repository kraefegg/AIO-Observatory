# KRAEFEGG M.O. — GOVERNANÇA

Políticas de qualidade, segurança profissional, segurança da informação e rastreabilidade
da organização digital. Todo agente deve operar sob estas regras.

---

## 1. SEGURANÇA PROFISSIONAL

Distinguir sempre **AI ASSISTANCE** de **PROFESSIONAL RESPONSIBILITY**.

Nunca:
- inventar assinatura, ART/RRT, registro profissional;
- declarar aprovação de órgão ou protocolo inexistente;
- inventar laudos, medições, inspeções, ensaios ou resultados laboratoriais;
- inventar fontes, referências ou dados.

Quando necessário:
```
HUMAN PROFESSIONAL REVIEW REQUIRED
```

## 2. SEGURANÇA DA INFORMAÇÃO

- **Nunca** gravar segredos, credenciais, tokens, passwords ou API keys em arquivos de memória.
- Credenciais vivem fora do repositório (env vars / cofre) — mesma política do projeto.
- Não expor dados sensíveis de clientes sem necessidade e sem autorização.

## 3. FONTES E REFERÊNCIAS

Prioridade de fontes:
```
OFFICIAL → REGULATORY → SCIENTIFIC → ACADEMIC → TECHNICAL → SECONDARY
```
- Nenhuma referência inexistente. Toda referência deve ser verificável.
- Quando envolver legislação atual, verificar a versão vigente. Nunca inventar legislação.
- Não usar fonte secundária quando houver fonte oficial adequada disponível.

## 4. DOCUMENTOS TÉCNICOS

Todo documento técnico registra:
```
Objective · Scope · Methodology · Data Sources · Assumptions · Limitations · Results ·
Analysis · Conclusion · Recommendations · References · Version · Date ·
Responsible AI Agent · Human Reviewer
```

## 5. SISTEMAS

Todo sistema desenvolvido registra (quando aplicável):
```
Requirements · Architecture · Database Schema · API Specification · Frontend · Backend ·
Authentication · Authorization · Logging · Testing · Documentation · Deployment ·
Monitoring · Security · Version Control
```

## 6. IoT

Todo projeto IoT registra:
```
Environmental/Operational Requirements · Sensor Specification · Hardware Architecture ·
Communication Protocol · Power Architecture · Firmware · Edge Processing · Cloud/Data Layer ·
Database · Dashboard · Alerts · Calibration · Testing · Maintenance · Documentation
```

## 7. QA E VEREDITOS

Classificação de revisão:
```
PASS · PASS_WITH_WARNINGS · REVISE · HUMAN_REVIEW_REQUIRED
```
Cada `REVISE` gera parecer direcionado ao agente responsável, com loop de correção (máx. 3 iterações).

## 8. CONTROLE DE VERSÃO E RASTREABILIDADE

- Todo entregável tem `Version` e `Date`.
- Decisões e lições aprendidas registradas em `memory/decisions.md` e `memory/lessons-learned.md`.
- Cada projeto mantém `projects/<id>/` com project.md, team.md, tasks.md, decisions.md,
  sources.md, risks.md, deliverables/, reviews/ e memory.md.
