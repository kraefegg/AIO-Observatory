# KRAEFEGG M.O. — DEMANDAS DE TESTE (ROUTING)

Conjunto de 10 demandas de teste para validar o ROUTING ENGINE e o PROTOCOLO DE
DELEGAÇÃO (ver `organization/workflows.md`). Cada demanda apresenta o pedido bruto,
a classificação esperada e a rota de agentes prevista pela COMPETENCY MATRIX.

Critério de aprovação: o routing automático reproduz (ou, em desvio, justifica) a rota
esperada abaixo, usando os IDs de agente do `agent-registry.md`.

---

## DEMANDA TESTE 01 — Licenciamento ambiental (LP)
- **Pedido:** "Preciso do licenciamento prévio (LP) para um novo empreendimento portuário."
- **Tipo:** Licenciamento ambiental
- **Rota esperada:**
  `ENV-001 → ENV-LIC-001 → NAV-001 → PORT-001 → REG-001 → GIS-001 → QA-001`
- **Risco:** médio · **Revisão humana:** não

## DEMANDA TESTE 02 — EIA/RIMA de empreendimento minerário
- **Pedido:** "Elaborar EIA/RIMA para abertura de mina com impacto em área de Caatinga."
- **Tipo:** Estudo ambiental completo
- **Rota esperada:**
  `ENV-001 → ENV-LIC-001 → MIN-001 → GEO-001 → FOR-001 → GIS-001 → REG-001 → SCI-001 → WORD-001 → QA-001`
- **Risco:** alto · **Revisão humana:** sim

## DEMANDA TESTE 03 — Monitoramento ambiental com sensores e dashboard
- **Pedido:** "Monitorar qualidade da água e do ar no terminal e gerar dashboard em tempo real."
- **Tipo:** Monitoramento remoto + IoT
- **Rota esperada:**
  `ENV-MON-001 → IOT-001 → SENSOR-001 → EMB-001 → EDGE-001 → DATA-001 → GIS-001 → SWE-001 → FRONTEND-001 → ENV-ESG-001 → QA-001`
- **Risco:** médio · **Revisão humana:** não

## DEMANDA TESTE 04 — Usina solar fotovoltaica
- **Pedido:** "Projeto de usina solar de 5 MWp para o retrofit de um terminal."
- **Tipo:** Projeto de energia
- **Rota esperada:**
  `ENE-001 → CIV-001 → ENV-001 → ENV-LIC-001 → GIS-001 → DATA-001 → CAD-001 → PMO-001 → QA-001`
- **Risco:** médio · **Revisão humana:** não

## DEMANDA TESTE 05 — Área contaminada + IoT + Edge AI + ESG (exemplo 40)
- **Pedido:** "Caracterizar área contaminada por hidrocarbonetos e estruturar monitoramento contínuo com sensores e dashboard ESG."
- **Tipo:** Contaminação + IoT + dashboard
- **Rota esperada:**
  `PMO-001 → ENV-001 → ENV-CONT-001 → GEO-001 → IOT-001 → SENSOR-001 → EMB-001 → EDGE-001 → DATA-001 → GIS-001 → SWE-001 → FRONTEND-001 → ENV-ESG-001 → WORD-001 → QA-001`
- **Risco:** alto · **Revisão humana:** sim

## DEMANDA TESTE 06 — Conformidade MARPOL / IMO de embarcação
- **Pedido:** "Verificar conformidade MARPOL Annex V e emitir parecer para frota."
- **Tipo:** Conformidade marítima
- **Rota esperada:**
  `IMO-001 → MAR-001 → NAV-001 → REG-001 → QA-001`
- **Risco:** médio · **Revisão humana:** não

## DEMANDA TESTE 07 — PRAD / restauração de Caatinga
- **Pedido:** "Elaborar PRAD com plano de revegetação por espécies nativas e monitoramento de sobrevivência."
- **Tipo:** Restauração ambiental
- **Rota esperada:**
  `ENV-PRAD-001 → FOR-001 → GIS-001 → ENV-MON-001 → REMSENS-001 → WORD-001 → QA-001`
- **Risco:** médio · **Revisão humana:** sim (ART/RRT)

## DEMANDA TESTE 08 — Sistema web de gestão de projetos
- **Pedido:** "Construir aplicação web fullstack para gestão de projetos com autenticação e painel."
- **Tipo:** Desenvolvimento de software
- **Rota esperada:**
  `SWE-001 → BACKEND-001 → FRONTEND-001 → DATABASE-001 → QA-001 → DEVOPS-001`
- **Risco:** médio · **Revisão humana:** não

## DEMANDA TESTE 09 — Inteligência de mercado e prospecção
- **Pedido:** "Levantar oportunidades de mercado no setor portuário nordestino e gerar proposta B2B."
- **Tipo:** Inteligência de mercado + comercial
- **Rota esperada:**
  `RES-001 → MARKET-001 → BUSINESS-001 → SALES-001 → WORD-001 → QA-001`
- **Risco:** baixo · **Revisão humana:** não

## DEMANDA TESTE 10 — Relatório ESG anual do terminal
- **Pedido:** "Consolidar indicadores ESG ambientais e sociais do terminal em relatório anual."
- **Tipo:** Relatório ESG
- **Rota esperada:**
  `ENV-ESG-001 → ENV-MON-001 → DATA-001 → EXCEL-001 → WORD-001 → PPT-001 → QA-001`
- **Risco:** médio · **Revisão humana:** não

---

## RESUMO DO TESTE
| # | Tipo | No. agentes na rota | Revisão humana |
|---|------|--------------------|----------------|
| 01 | Licenciamento LP | 7 | não |
| 02 | EIA/RIMA minerário | 10 | sim |
| 03 | Monitoramento + IoT | 11 | não |
| 04 | Usina solar | 9 | não |
| 05 | Contaminação + IoT + ESG | 15 | sim |
| 06 | Conformidade MARPOL | 5 | não |
| 07 | PRAD/Caatinga | 7 | sim |
| 08 | Software fullstack | 6 | não |
| 09 | Mercado + B2B | 6 | não |
| 10 | Relatório ESG | 7 | não |
