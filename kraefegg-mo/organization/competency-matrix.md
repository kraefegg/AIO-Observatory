# KRAEFEGG M.O. — COMPETENCY MATRIX

Matriz de roteamento que relaciona `TASK → REQUIRED SKILL → PRIMARY AGENT → SECONDARY AGENT → REVIEW AGENT → TOOL → DELIVERABLE`.
O Master Orchestrator usa esta matriz (junto ao Agent Registry) para montar equipes — **sem codificar routing em um único arquivo**.

---

## MATRIZ

| TASK | Required Skill | Primary | Secondary | Review | Tool | Deliverable |
|---|---|---|---|---|---|---|
| Diagnóstico ambiental | diagnóstico, linha de base | ENV-001 | ENV-MON-001 | QA-001 | QGIS, Excel | relatório de diagnóstico |
| Estudo de impacto (EIA/RIMA) | impacto, licenciamento | ENV-001 | ENV-LIC-001, REG-001, SCI-001 | TECH-REVIEW-001 | Word | EIA/RIMA |
| Licença Prévia (LP) | licenciamento, regulatório | ENV-LIC-001 | ENV-001, REG-001 | QA-001 | Word, bases oficiais | requerimento LP |
| PRAD / restauração | restauração, flora | ENV-PRAD-001 | FOR-001, ENV-001 | TECH-REVIEW-001 | QGIS, Excel | PRAD |
| Monitoramento de área contaminada | contaminação, hidrogeologia | ENV-CONT-001 | GEO-001, ENV-MON-001 | QA-001 | QGIS, Excel | plano de monitoramento |
| Sistema IoT ambiental | IoT, sensores | IOT-001 | SENSOR-001, EMB-001 | QA-001 | ESP32, MQTT | arquitetura IoT |
| Dashboard ESG | indicadores ESG | ENV-ESG-001 | DATA-001, FRONTEND-001 | QA-001 | web, Excel | dashboard ESG |
| Projeto de usina solar | energia, fotovoltaica | ENE-001 | CIV-001, ENV-LIC-001, CAD-001 | TECH-REVIEW-001 | CAD, Excel | projeto da usina |
| Projeto GIS | análise espacial | GIS-001 | GEOAI-001, DATA-001 | QA-001 | QGIS, PostGIS | mapa/análise espacial |
| Sistema web | software, frontend | SWE-001 | FRONTEND-001, BACKEND-001 | QA-001 | Vite, React, API | aplicação web |
| Backend/API | backend, API | BACKEND-001 | API-001, DATABASE-001 | QA-001 | FastAPI, REST | API |
| Pipeline de dados | dados, ETL | DATA-001 | DATABASE-001 | QA-001 | Python | pipeline |
| Modelo ML/IA | ML, IA | ML-001 | AI-001, DATA-001 | TECH-REVIEW-001 | Python | modelo |
| RAG/agente IA | LLM, RAG, agentes | AGENT-001 | LLM-001, RAG-001, PROMPT-001 | QA-001 | LangGraph | sistema de agentes |
| Projeto marítimo/portuário | naval, marítimo | NAV-001 | MAR-001, PORT-001, IMO-001 | TECH-REVIEW-001 | CAD, documentos IMO | projeto marítimo |
| Firmware IoT | firmware, embedded | EMB-001 | EDGE-001, WOKWI-001 | QA-001 | C/C++, MicroPython | firmware |
| Edge AI | edge, IA local | EDGE-001 | EMB-001, AI-001 | QA-001 | Python, edge runtimes | inferência local |
| Desenho técnico | CAD | CAD-001 | BIM-001 | DOC-CONTROL-001 | CAD | planta |
| Planilha de engenharia | Excel | EXCEL-001 | DATA-001 | DOC-CONTROL-001 | Excel | planilha |
| Documentação técnica | Word, escrita técnica | WORD-001 | DOC-CONTROL-001 | TECH-REVIEW-001 | Word | documento |
| Apresentação executiva | PowerPoint | PPT-001 | WORD-001 | DOC-CONTROL-001 | PowerPoint | apresentação |
| Pesquisa regulatória | regulatório, fontes | REG-001 | SCI-001 | QA-001 | bases oficiais | parecer regulatório |
| Pesquisa de mercado | mercado, inteligência | MARKET-001 | BUSINESS-001 | QA-001 | web | análise de mercado |
| Prospecção/negócio | BD, propostas | BUSINESS-001 | BD-001, SALES-001 | QA-001 | Word, Excel | proposta comercial |
| Planejamento de projeto | PMO, WBS | PMO-001 | DOC-CONTROL-001 | QA-001 | ferramentas de PM | cronograma/WBS |
| Auditoria ambiental | auditoria | ENV-AUD-001 | ENV-001 | TECH-REVIEW-001 | checklists | relatório de auditoria |
| Perícia ambiental | perícia, forense | ENV-FOR-001 | ENV-CONT-001 | HUMAN_REVIEW | laudos | laudo pericial |

---

## REGRAS DE ROTEAMENTO

1. Consultar `agent-registry.md` para descobrir agentes disponíveis.
2. Usar esta matriz para formar a equipe primária/secundária/revisora por tarefa.
3. Demanda multidisciplinar: montar a equipe combinando linhas múltiplas da matriz.
4. Revisão obrigatória via QA/TECH-REVIEW/DOC-CONTROL conforme a natureza.
5. Risco alto/legal → `HUMAN_PROFESSIONAL_REVIEW_REQUIRED`.
6. Extensível: adicionar linhas sem reescrever o orchestrator.
