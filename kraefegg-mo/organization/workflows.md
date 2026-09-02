# KRAEFEGG M.O. — WORKFLOWS

Padrões de execução da organização digital. O **Workflow Universal** é o fluxo-mestre;
workflows de domínio estendem/refinam etapas específicas.

---

## WORKFLOW UNIVERSAL

```text
INTAKE
  ↓
CLASSIFICATION          (domínio, entregável, complexidade, risco)
  ↓
SCOPING                (objetivo, entregáveis, fontes, restrições)
  ↓
AGENT SELECTION        (via AGENT REGISTRY + COMPETENCY MATRIX)
  ↓
TEAM FORMATION         (Lead Agent + equipe + revisores)
  ↓
TASK DECOMPOSITION     (tarefas + dependências)
  ↓
EXECUTION              (tarefas independentes em paralelo)
  ↓
INTEGRATION
  ↓
QA / PEER REVIEW       (PASS | PASS_WITH_WARNINGS | REVISE | HUMAN_REVIEW_REQUIRED)
  ↓
HUMAN REVIEW           (quando exigido por risco/regulação)
  ↓
FINAL DELIVERY
  ↓
MEMORY UPDATE
```

---

## PROTOCOLO DE DELEGAÇÃO

Toda demanda recebida é convertida em uma ficha estruturada, persistida em `projects/<demand_id>/`:

```yaml
demand_id:
title:
objective:
domain:
subdomains:
priority:
risk:
deadline:
deliverables:
required_agents:
secondary_agents:
review_agents:
tools:
sources:
dependencies:
human_validation:
status:
```

Regras de delegação:
1. O **Master Orchestrator** identifica domínio e entregável; se o escopo é de um único domínio e baixo risco, pode delegar direto ao Lead Agent.
2. Demanda **multidisciplinar**: montar equipe a partir da COMPETENCY MATRIX.
3. O **Lead Agent** coordena os especialistas; especialistas podem solicitar `CREATE_SUBAGENT` ao orchestrator quando a tarefa for excessivamente complexa.
4. Tarefas **independentes** executam em paralelo; tarefas com dependência aguardam a entrada.
5. **Revisão**: QA/TECH-REVIEW revisa todo entregável; DOC-CONTROL garante versão/rastreabilidade.

---

## ROUTING ENGINE (exemplos canônicos)

### Licenciamento ambiental — LP
```
ENV-001 → ENV-LIC-001 → REG-001 → GIS-001 → DOC-001 → QA-001
```

### EIA/RIMA para empreendimento minerário
```
ENV-001 → ENV-LIC-001 → MIN-001 → GEO-001 → FOR-001 → GIS-001 → REG-001 → SCI-001 → DOC-001 → QA-001
```

### Monitoramento ambiental com sensores e dashboard
```
ENV-001 → ENV-MON-001 → IOT-001 → SENSOR-001 → EMB-001 → EDGE-001 → DATA-001 → GIS-001 → SWE-001 → FRONTEND-001 → ESG-001 → QA-001
```

### Usina solar
```
ENE-001 → CIV-001 → ENV-001 → GIS-001 → ENV-LIC-001 → DATA-001 → CAD-001 → PMO-001 → QA-001
```

### Área contaminada + IoT + Edge AI + GIS + dashboard ESG (exemplo nº 40)
```
PMO-001 → ENV-001 → ENV-CONT-001 → GEO-001 → IOT-001 → SENSOR-001 → EMB-001 → EDGE-001 → DATA-001 → GIS-001 → SWE-001 → FRONTEND-001 → ENV-ESG-001 → WORD-001 → QA-001
```

---

## EXECUÇÃO EM PARALELO

O orchestrator identifica tarefas sem dependência entre si e as executa em paralelo
(ex.: caracterização ambiental, prospecção de mercado e arquitetura IoT podem rodar em paralelo),
consolidando resultados antes do QA.

---

## CRIAÇÃO DE SUBAGENTES

Quando um Lead Agent julga a tarefa excessivamente complexa:
```
CREATE_SUBAGENT → novo agente (função, escopo, skills, ferramentas, fontes, memória, QA)
```
O novo agente é registrado no `agent-registry.md`. A adição é **configurável**, sem reescrever o orchestrator.
