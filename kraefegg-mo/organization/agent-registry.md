# KRAEFEGG M.O. — AGENT REGISTRY

Registro mestre de todos os agentes funcionais da organização digital. O **Master Orchestrator**
consulta este registro para descobrir agentes disponíveis (extensível por configuração — não hardcoded).

Campos: `Agent ID · Name · Department · Role · Skills · Can Delegate · Can Review · Risk · Status`

---

## EXECUTIVE / ORCHESTRATION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| CEO-001 | CEO-agent | Executive Office | Estratégia, aprovação, conselho | Sim | Sim | Alto | Ativo |
| MO-001 | Master Orchestrator | Orquestração | Intake, classificação, equipe, QA | Sim | Sim | Alto | Ativo |
| PMO-001 | Project Manager | PMO | Planejamento, WBS, marcos, risco | Sim | Sim | Médio | Ativo |

## ENGINEERING DIVISION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| ENV-001 | Environmental Engineer | Engineering / Environment | Engenharia ambiental, licenciamento, monitoramento | Sim | Sim | Alto | Ativo |
| CIV-001 | Civil Engineer | Engineering / Civil | Infraestrutura, obras, estruturas, drenagem | Sim | Sim | Alto | Ativo |
| MEC-001 | Mechanical Engineer | Engineering / Mechanical | Sistemas mecânicos, HVAC, manutenção | Sim | Sim | Médio | Ativo |
| NAV-001 | Naval Engineer | Engineering / Maritime | Engenharia naval, embarcações, MARPOL | Sim | Sim | Alto | Ativo |
| FOR-001 | Forestry Engineer | Engineering / Forestry | Florestal, restauração, inventário, biomassa | Sim | Sim | Médio | Ativo |
| SAF-001 | Safety Engineer | Engineering / Safety | Segurança do trabalho, HAZOP, emergência | Sim | Sim | Alto | Ativo |
| GEO-001 | Geologist | Engineering / Geological | Geologia, hidrogeologia, mapeamento | Sim | Sim | Médio | Ativo |
| MIN-001 | Mining/Mineralogy Specialist | Engineering / Mining | Mineração, mineralogia, fechamento de mina | Sim | Sim | Alto | Ativo |
| ENE-001 | Energy Engineer | Engineering / Energy | Renováveis, fotovoltaica, eficiência | Sim | Sim | Médio | Ativo |

## ENVIRONMENT & ESG DIVISION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| ENV-LIC-001 | Env. Licensing Specialist | Environment | Licenciamento LP/LI/LO | Sim | Sim | Alto | Ativo |
| ENV-MON-001 | Env. Monitoring Specialist | Environment | Monitoramento ambiental | Sim | Sim | Alto | Ativo |
| ENV-CONT-001 | Contaminated Areas Specialist | Environment | Áreas contaminadas | Sim | Sim | Alto | Ativo |
| ENV-PRAD-001 | Restoration/PRAD Specialist | Environment | PRAD, restauração | Sim | Sim | Alto | Ativo |
| ENV-ESG-001 | ESG Specialist | Environment | Indicadores ESG | Sim | Sim | Médio | Ativo |
| ENV-AUD-001 | Env. Audit Specialist | Environment | Auditoria ambiental | Sim | Sim | Alto | Ativo |
| ENV-FOR-001 | Env. Forensics Specialist | Environment | Perícia ambiental | Não | Sim | Alto | Ativo |

## MARITIME & PORT DIVISION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| MAR-001 | Maritime Operations | Maritime | Operações marítimas | Sim | Sim | Médio | Ativo |
| PORT-001 | Port Engineer | Maritime | Engenharia portuária | Sim | Sim | Médio | Ativo |
| IMO-001 | IMO/Maritime Compliance | Maritime | MARPOL, normas IMO | Sim | Sim | Alto | Ativo |
| PORT-INT-001 | Port Intelligence | Maritime | Inteligência portuária | Sim | Sim | Médio | Ativo |

## DIGITAL ENGINEERING DIVISION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| SWE-001 | Software Engineer | Software | Engenharia de software | Sim | Sim | Médio | Ativo |
| BACKEND-001 | Backend Engineer | Software | Backend/API | Sim | Sim | Médio | Ativo |
| FRONTEND-001 | Frontend Engineer | Software | Frontend | Sim | Sim | Baixo | Ativo |
| FULLSTACK-001 | Fullstack Engineer | Software | Fullstack | Sim | Sim | Médio | Ativo |
| MOBILE-001 | Mobile Engineer | Software | Mobile | Sim | Sim | Médio | Ativo |
| API-001 | API Engineer | Software | APIs | Sim | Sim | Médio | Ativo |
| DATABASE-001 | Database Engineer | Software | Banco de dados | Sim | Sim | Médio | Ativo |
| DEVOPS-001 | DevOps Engineer | Software | Deploy, CI/CD, cloud | Sim | Sim | Alto | Ativo |
| DATA-001 | Data Engineer | Data | Pipelines, dados | Sim | Sim | Médio | Ativo |

## AI DIVISION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| AI-001 | AI Engineer | AI | Integração de IA | Sim | Sim | Médio | Ativo |
| ML-001 | ML Engineer | AI | Modelos ML | Sim | Sim | Médio | Ativo |
| LLM-001 | LLM Engineer | AI | LLMs | Sim | Sim | Médio | Ativo |
| AGENT-001 | Agent Engineer | AI | Sistemas de agentes | Sim | Sim | Médio | Ativo |
| PROMPT-001 | Prompt Engineer | AI | Engenharia de prompt | Sim | Sim | Baixo | Ativo |
| RAG-001 | RAG Engineer | AI | RAG, embeddings | Sim | Sim | Médio | Ativo |

## GIS / GEOAI
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| GIS-001 | GIS Engineer | GIS | QGIS/ArcGIS, análise espacial | Sim | Sim | Médio | Ativo |
| GEOAI-001 | GeoAI Engineer | GIS | GeoAI, aprendizado geoespacial | Sim | Sim | Médio | Ativo |
| REMSENS-001 | Remote Sensing Specialist | GIS | Sensoriamento remoto, NDVI | Sim | Sim | Médio | Ativo |

## IoT / EMBEDDED
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| IOT-001 | IoT Engineer | IoT | Arquitetura IoT, MQTT, LoRa | Sim | Sim | Médio | Ativo |
| EMB-001 | Embedded Engineer | Embedded | Firmware, C/C++, ESP32 | Sim | Sim | Médio | Ativo |
| EDGE-001 | Edge AI Engineer | Edge | Edge computing, Edge AI | Sim | Sim | Médio | Ativo |
| SENSOR-001 | Sensor Engineer | IoT | Especificação de sensores | Sim | Sim | Médio | Ativo |
| AUTO-001 | Automation Engineer | Embedded | Automação | Sim | Sim | Médio | Ativo |
| WOKWI-001 | Wokwi Engineer | Embedded | Prototipagem/simulação | Sim | Sim | Baixo | Ativo |

## DESIGN & DOCUMENTATION
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| CAD-001 | CAD Engineer | CAD | Desenho técnico | Sim | Sim | Médio | Ativo |
| BIM-001 | BIM Engineer | BIM | Modelagem BIM | Sim | Sim | Médio | Ativo |
| SKETCH-001 | SketchUp Specialist | CAD | Modelagem 3D SketchUp | Sim | Sim | Baixo | Ativo |
| EXCEL-001 | Excel Engineer | Office | Planilhas de engenharia | Sim | Sim | Baixo | Ativo |
| WORD-001 | Word Engineer | Office | Documentação técnica | Sim | Sim | Baixo | Ativo |
| PPT-001 | PowerPoint Engineer | Office | Apresentações técnicas | Sim | Sim | Baixo | Ativo |

## RESEARCH
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| RES-001 | Research Specialist | Research | Pesquisa geral | Sim | Sim | Baixo | Ativo |
| REG-001 | Regulatory Research | Research | Pesquisa regulatória | Sim | Sim | Alto | Ativo |
| SCI-001 | Scientific Research | Research | Pesquisa científica | Sim | Sim | Médio | Ativo |
| MARKET-001 | Market Intelligence | Research | Inteligência de mercado | Sim | Sim | Médio | Ativo |
| TECHINT-001 | Technology Intelligence | Research | Inteligência tecnológica | Sim | Sim | Médio | Ativo |

## BUSINESS
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| BUSINESS-001 | Business Development | Business | Desenvolvimento de negócio | Sim | Sim | Médio | Ativo |
| BD-001 | BD Representative | Business | Representação BD | Sim | Sim | Médio | Ativo |
| SALES-001 | Sales Specialist | Business | Vendas | Sim | Sim | Médio | Ativo |
| MARKETING-001 | Marketing Specialist | Business | Marketing | Sim | Sim | Médio | Ativo |

## QUALITY & GOVERNANCE
| Agent ID | Name | Department | Role | Can Delegate | Can Review | Risk | Status |
|---|---|---|---|---|---|---|---|
| QA-001 | Quality Assurance | Quality | Revisão de qualidade | Não | Sim | Alto | Ativo |
| TECH-REVIEW-001 | Technical Reviewer | Quality | Revisão técnica | Não | Sim | Alto | Ativo |
| DOC-CONTROL-001 | Document Control | Quality | Controle de documentos | Não | Sim | Médio | Ativo |

---

## Extensibilidade

Novos agentes (Electrical Engineer, Chemical Engineer, Oceanographer, Meteorologist,
Robotics Engineer, Drone Specialist, Satellite Remote Sensing, e outros) devem ser adicionados
**adicionando linhas a este registro + arquivos em `agents/<categoria>/<id>/`**, sem reescrever o orchestrator.
