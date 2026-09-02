# KRAEFEGG M.O. — ROUTING VALIDATION

Protocolo de verificação do ROUTING ENGINE (base: `organization/workflows.md` e
`organization/competency-matrix.md`).

## Objetivo
Garantir que, para uma demanda qualquer, o conjunto de agentes selecionados seja
coerente com (a) o domínio/entregável e (b) as competências registradas por agente.

## Entradas
- Demanda bruta (texto do solicitante).
- `agent-registry.md` (identidade de cada agente).
- `competency-matrix.md` (TASK → PRIMARY → SECONDARY → REVIEW → TOOL → DELIVERABLE).

## Passos de validação
1. **Classificação** — derivar domínio, subdomínio e tipo de entregável do texto.
2. **Seleção** — para cada etapa do fluxo, consultar a competência primária na matriz.
3. **Ordem** — ordenar agentes segundo o workflow Universal (Lead → especialistas → QA).
4. **Integridade** — verificar que todo ID citado existe no `agent-registry.md`.
5. **Revisão humana** — marcar `review_agents` quando risco alto ou regulado
   (ex.: ART/RRT para engenharia, relatórios ambientais, conformidade marítima).

## Critério de aprovação
- Rota gerada == rota esperada da planilha `tests/test-demands.md`, OU
- desvio justificado por escrito (domínio/competência ausente na rota base).

## Checklist de conferência (automatizável)
- [ ] Todos os IDs resolvem para um `agent.md` existente.
- [ ] Cada agente da rota tem a competência exigida na etapa.
- [ ] Rota inicia com Lead/Tipo, termina em QUALITY (QA-001 / TECH-REVIEW-001).
- [ ] `review_agents` presente quando `human_validation: true`.
- [ ] Nenhum agente fora do escopo da demanda na rota.

## Execução
O `Master Orchestrator` (MO-001) aplica este protocolo na classificação de toda
demanda (planilha `tests/test-demands.md` serve como banco de regressão).
