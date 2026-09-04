# Teste da Porta de Demandas — D-24 (2026-09-04)

Teste ponta a ponta: criação → despacho → agentes na nuvem → entrega multiformato no Drive.

## Origem → Destino

```
PORTAL (Supabase POST, id 28)  SUPA BASE
   │  criado_em 17:12:38Z  (fase backlog, prog 0)
   ▼
ce-strategic  POST /processar (token X-HQ-Token)
   │  "agentes acionados na nuvem" | despachadas=[D-24]
   ▼
GRAFO CEO (ce-strategic) ── OpenRouter / OmniRoute (auto/best-reasoning)
   ├─ n_estrutura  (CEO define estrutura do conselho)
   ├─ n_conselho   (conselheiros pesquisam web)
   ├─ n_decide     (critica/veredito/direcionamento)
   ├─ n_despacho   (10 setores: Mercado, P&D, Comercial, Engenharias, Ambiental+SST, ...)
   ├─ n_resultado  (resumo executivo)
   └─ n_exportables (md, json, csv, xml, txt, PDF, RTF)
   │
   ▼
GOOGLE DRIVE kraefegg.mos3@gmail.com
CEO - Demandas HQ/Demanda-D-24/
├── 01-Mercado/report-s1-mercado-inteligencia.md
├── 02-P&D/report-s2-pesquisa-desenvolvimento.md
├── 03-Comercial/report-s3-prospeccao-marketing.md
├── 04-Engenharia/report-s4-engenharias.md
├── 05-Ambiental/report-s5-ambiental-seguranca.md
├── 06-Entregas/report-s6-entregas-e-resultado.md
└── 06-Entregas/exportables/
    ├── resumo.pdf   ├── resumo.json   ├── resumo.csv
    ├── resumo.xml   ├── resumo.md     ├── resumo.txt
    └── resumo.rtf  (7/7 publicados)
```

## Tempo de processamento

| Estágio | Fase/progresso | Duração |
|---|---|---|
| Criação → despacho | backlog → analise | ~0s (automático) |
| Análise (estrutura + conselho web + decisão) | analise 10→46% | 358s |
| Execução (10 setores em paralelo) | execucao 65→95% | 357s |
| Conclusão (resultado + exportables + upload) | concluida 98→100% | ~103s(+upload) |
| **Total (criação → conclusão)** | | **818s (~13min38s)** |

## Resultados (arquivos diversos) — 13 arquivos no Drive

| Formato | Arquivo | Tamanho |
|---|---|---|
| PDF | resumo.pdf | 7.277 B |
| JSON | resumo.json | 14.251 B |
| CSV | resumo.csv | 14.138 B |
| XML | resumo.xml | 14.504 B |
| Markdown | resumo.md | 13.338 B |
| TXT | resumo.txt | 13.338 B |
| RTF (Word-compatível) | resumo.rtf | 4.498 B |
| 6 × Markdown setorial | report-s1..s6-*.md | 8.644–14.433 B |

## Workflows

1. **Individual (real-time):** dashboard `salvarDemanda` → `POST /demanda` → grafo já com marcador `[ESTRATEGICO]` (evita dupla execução).
2. **Lote autônomo:** cron Code Engine `hq-estrategico-auto` (`*/15 * * * *`) → `POST /processar` → processa apenas pendentes (`EM_EXECUCAO` bloqueia paralelo).
3. **Técnico/operacional:** job `hq-orquestrador` (`planoPara` genérico via IA) pula `[ESTRATEGICO]` e cuida de entrega/pastas na perna técnica.
4. **Garantias:** retry+backoff (Supabase/Drive 3x), `[ESTRATEGICO]` persistente, lock em memória, verificação pós-upload, `fase=concluida` só após entrega.

## Exportables

- Geração local em `/app/out/<codigo>/exportables` dentro do app; upload para `06-Entregas/exportables/` no Drive da demanda.
- Mesmo conteúdo estrutural em 7 formatos (pdf, json, csv, xml, md, txt, rtf) — atende "arquivos diversos/exportables" sem dependências externas.