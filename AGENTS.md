# AGENTS.md

Static, single-page web app — "AIO Observatory", a geo-environmental monitoring dashboard (in Portuguese, pt-BR) for the PRAD Caraúbas-PB restoration project (Caatinga, Paraíba, Brazil). Vanilla JS + CDN libraries. **No build system, no package.json, no tests, no lint.**

## Source of truth
- Only edit the root files: `index.html`, `data.js`, `pages.js`, `style.css`, `app.js`.
- `AIO_Observatory/`, `AIO_Observatory_v2/`, and `AIO_Observatory.zip` / `AIO_Observatory_v2.zip` are byte-identical snapshot copies made by the owner for distribution. Do NOT edit them; the owner re-exports them.

## Run / verify
No install. Open `index.html` in a browser (or serve statically). Live data requires network; if a remote source fails, the app degrades to model/fallback values silently, so test with a connection. All verification is manual in the browser.

## Architecture
Script load order in `index.html` matters: `data.js` → `pages.js` → `app.js`. `app.js` is an IIFE `AIOApp` that boots on `window.load`.
- `data.js` — global `AIO` config: project metadata, spectral index series, KPIs, alerts, INPE fire config, hydro model (Q = A × V), tree model, remote-sensing panels, NDVI dataset list.
- `pages.js` — global `PAGES`: one template function per page (dashboard, meteorologia, climatologia, vegetacao, solo, hidrico, sensoriamento, mapas, csv, relatorios, ia, config). Pages are HTML template literals.
- `app.js` — routing (`go()` injects `PAGES[id]()` into `#content` then calls the matching `renderXyz()`), live data fetch, charts, Leaflet map, CSV/report export.

## Conventions & gotchas
- All UI copy and code comments are pt-BR; keep new text in Portuguese.
- Runtime mutates the global `AIO` object (e.g., real NDVI replaces `AIO.indices.ndvi`, sets `AIO._ndviIsReal`, `AIO._fire`). NDVI data is sniffed from repo CSV by column-name regex in `sniffDateMean`.
- ECharts instances are disposed and recreated on every render via the `ec()` helper (SVG renderer); Chart.js sparklines via `spark()`.
- Reports are persisted in `localStorage` (delete/restore features exist).
- Live sources (all fetched client-side): Open-Meteo forecast at `AIO.project` lat/lon; INPE BDQueimadas daily CSV for fire hotspots within 60 km; GitHub repo `kraefegg/AIO` for real Sentinel-2 NDVI CSVs + timelapse GIFs; Esri satellite tiles for the map. NDVI is real; NDWI/Moisture/BSI remain model series until numeric exports exist.
- Oracle Cloud (OCI): connection verified, details in `docs/oracle-cloud-connection.md`. Secrets live in `~/.oci/oci_auth.env` (outside repo, never versioned). Auth works via Swift API; S3-compatível fails for federated IDCS user (slash breaks SigV4).
