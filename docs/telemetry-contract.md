# Contrato de Telemetria IoT — AIO Observatory (RFC · PoC M1)

Status: **proposta para revisão do CTO** · Autor: `engineering-dev` · Aplicação: AIO Observatory

## Objetivo
Padronizar o envio de dados dos kits IoT/Edge/Embedded (estação meteorológica e futuros kits) para o dashboard AIO Observatory, mantendo o app **estático e sem backend** (fetch + CSV/JSON, com degradação graciosa offline).

## Fluxo
```
[Sensores] -> [Edge ESP32-S3] --MQTT--> [Broker] --ponte--> telemetry/station-latest.json (GitHub) --> AIO (fetch)
```
- Firmware: `firmware/station_weather.py` (MicroPython, deep sleep, ciclo configurável em `SLEEP_S`).
- Credenciais: `firmware/config.py` (copiar de `config.py.example`) — **nunca versionar**.
- A ponte (GitHub Actions / Cloudflare Worker / Node) publica o último payload em `telemetry/station-latest.json` no repo `kraefegg/AIO`; o app lê via `AIO.telemetry.source`.

## Payload (aplicação)
```json
{
  "site": "car01",
  "ts": "2026-08-06T13:05:00Z",
  "metrics": {
    "temperature_c": 27.4, "humidity_pct": 52, "pressure_hpa": 988,
    "wind_speed_kmh": 14.2, "wind_gust_kmh": 21.5, "wind_dir_deg": 135,
    "rain_24h_mm": 0.0, "solar_mj_m2": 18.4
  },
  "battery_v": 4.1,
  "rssi_dbm": -67
}
```

## Campos
| Campo | Tipo | Unidade | Obrigatório |
|---|---|---|---|
| `site` | string | id do sítio (ver `AIO.sites`) | sim |
| `ts` | string | ISO-8601 UTC | sim |
| `metrics.temperature_c` | number | °C | sim |
| `metrics.humidity_pct` | number | % | sim |
| `metrics.pressure_hpa` | number | hPa | sim |
| `metrics.wind_speed_kmh` | number | km/h | sim |
| `metrics.wind_gust_kmh` | number | km/h | opcional |
| `metrics.wind_dir_deg` | number | graus (0=N) | opcional |
| `metrics.rain_24h_mm` | number | mm acumulado 24h | sim |
| `metrics.solar_mj_m2` | number | MJ/m² | opcional (P1: piranômetro) |
| `battery_v` | number | V | sim |
| `rssi_dbm` | number | dBm | opcional |

## Regras
- **Frescura**: o app considera o payload válido por `AIO.telemetry.ttl_ms` (5 min). Sem payload fresco, usa `AIO.telemetry.sample` (dado-modelo) e marca "dado-modelo" na UI.
- **Eventos discretos** (alarme, reinício) vão em tópico/coleção separada (fase P2), não neste payload.
- **Novos kits**: mesmo contrato, `site` distinto e métricas extras em `metrics` (compatível com leituras parciais).

## Integração no app
- `data.js`: `AIO.sites` + `AIO.telemetry` (fonte, TTL, sample).
- `app.js`: `fetchStationTelemetry()` (cache TTL) + `renderStationTelemetry()` (página Meteorologia, seção "Estação de Campo · Kit IoT").
- Segue o padrão existente de `loadNDVIFile`/`fetchWeather`: fetch + cache + fallback silencioso.

## Roadmap
| Fase | Item |
|---|---|
| P1 | Piranômetro solar + estação em campo real (validação Q=A×V com datalogger do rio) |
| P2 | Backend leve (FastAPI/Node) ou ingestão Oracle/Databricks; endpoint `GET /telemetry` |
| P3 | OTA/firmware update, OT-Security, multi-site |
