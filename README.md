# AIO Observatory

**Artificial Intelligence Observatory — PRAD Caraúbas-PB**

Sistema de monitoramento geoambiental do Projeto de Recuperação de Áreas Degradadas (PRAD) **Rio do Peixe I e II**, em Caraúbas/PB — Caatinga do Cariri Paraibano. Dashboard estático, single-page, em português (pt-BR), com dados em tempo real de fontes oficiais.

> Publicação: [kraefegg.github.io/AIO-Observatory](https://kraefegg.github.io/AIO-Observatory/)

---

## Visão geral

| Item | Valor |
|---|---|
| Área do PRAD | 5,73 km² |
| Município | Caraúbas — PB |
| Bioma | Caatinga (Cariri) |
| Coordenadas | 07°43'42"S 36°29'37"W |
| Altitude média | ≈ 455 m |
| Campanha atual | Julho/2026 |
| Stack | HTML + CSS + JS vanilla (sem build, sem dependências locais) |

## Páginas

`dashboard` · `meteorologia` · `climatologia` · `vegetacao` · `solo` · `hidrico` · `sensoriamento` · `mapas` · `csv` · `relatorios` · `ia` · `config`

## Fontes de dados (tempo real)

| Dado | Fonte | Como |
|---|---|---|
| Meteorologia atual + previsão 7d | [Open-Meteo](https://open-meteo.com) | API JSON no navegador |
| **Dados oficiais INMET** (estação automática + previsão 15d) | [INMET](https://portal.inmet.gov.br) | `bridge/dados_dinamicos.py` → JSON no repo |
| Focos de queimada | [INPE BDQueimadas](https://dataserver-coids.inpe.br) | CSV diário, raio de 60 km |
| NDVI real | Sentinel-2 L2A (export via [Sentinel Hub](https://www.sentinel-hub.com)) | CSVs no repo |
| Timelapses espectrais | Sentinel-2 | GIFs no repo |
| Mapa base | Esri Satellite | Leaflet |

**Degradação graciosa:** se uma fonte remota falhar, o app silencia e cai para valores modelo/fallback (mesma filosofia em todos os cards).

## Arquitetura

### Frontend (estático, sem build)

Ordem de carga em `index.html`: `data.js` → `pages.js` → `app.js`. O `app.js` é um IIFE `AIOApp` que sobe em `window.load`.

- `data.js` — configuração global `AIO`: metadados do projeto, índices espectrais, KPIs, alertas, config INPE, modelo hidrológico (Q = A × V), modelo de árvores, painéis de sensoriamento remoto, lista de datasets NDVI.
- `pages.js` — global `PAGES`: uma função-template por página (HTML template literals).
- `app.js` — roteamento (`go()` injeta `PAGES[id]()` em `#content` e chama `renderXyz()`), dados live, gráficos (ECharts SVG via helper `ec()`, sparklines Chart.js via `spark()`), mapa Leaflet, export CSV/relatório.
- `style.css` — tema HUD (Orbitron/Rajdhani/JetBrains Mono), claro/escuro.

### Bridge de dados dinâmicos (Python)

`bridge/dados_dinamicos.py` — **base de cálculos** que gera `telemetry/weather-oficial.json` a partir de fontes oficiais, sem dependências externas (stdlib puro):

- **INMET** estação automática mais próxima do geocode 2504074 (dados em tempo real: temperatura, umidade, pressão, vento, chuva, radiação);
- **INMET** previsão oficial para Caraúbas-PB;
- **Open-Meteo** precipitação real (série de 7 dias) para o modelo hidrológico.

Modelos computados: **ETo** (Hargreaves–Samani), **carga hidrológica Q = A × V**, **estimativa de árvores** (densidade Caatinga × NDVI) e **risco de queimada**. O app consome o JSON como fonte preferencial (`AIO.oficial`), com fallback para as APIs do INMET/Open-Meteo direto no navegador.

```bash
python bridge/dados_dinamicos.py            # grava telemetry/weather-oficial.json
python bridge/dados_dinamicos.py --print    # imprime o JSON sem gravar
```

### Telemetria IoT (PoC M1)

Kit estação meteorológica agro-ambiental:

- `firmware/station_weather.py` — firmware MicroPython (ESP32-S3, deep sleep);
- `bridge/mqtt_to_json.py` — ponte MQTT → `telemetry/station-latest.json`;
- `docs/telemetry-contract.md` — contrato do payload e roadmap (P1–P3).

Fluxo: `[Sensores] → [ESP32-S3] → MQTT → ponte → JSON (repo) → AIO (fetch)`.

## CI/CD

`.github/workflows/dados-dinamicos.yml` — gera e commita `telemetry/weather-oficial.json`:

- **agendado** a cada 30 min;
- **manual** via `workflow_dispatch` (botão "Run workflow");
- **no push** de `bridge/dados_dinamicos.py` ou do próprio workflow.

Usa `GITHUB_TOKEN` automático (sem segredos no repo). Só commita quando o JSON muda.

## Como rodar

Sem instalação:

1. Clone o repo;
2. Abra `index.html` no navegador (ou sirva estaticamente, ex.: `python -m http.server`).

Dados live exigem conexão com a internet. Teste com conexão ativa.

## Manutenção / convenções

- Arquivos-fonte editáveis: `index.html`, `data.js`, `pages.js`, `style.css`, `app.js`.
- `AIO_Observatory/`, `AIO_Observatory_v2/` e os `.zip` são snapshots byte-idênticos de distribuição, re-exportados pelo proprietário — **não editar**.
- Toda UI e comentários em pt-BR.
- Runtime muta o objeto global `AIO` (ex.: NDVI real substitui `AIO.indices.ndvi`).
- Relatórios persistidos em `localStorage` (com features de delete/restore).

## Roadmap

| Fase | Item |
|---|---|
| P1 | Piranômetro + estação em campo real (validação Q = A × V com datalogger) |
| P2 | Backend leve (FastAPI/Node) ou ingestão Oracle/Databricks; `GET /telemetry` |
| P3 | OTA/firmware update, OT-Security, multi-site |
