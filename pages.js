// ============ AIO OBSERVATORY — PAGE TEMPLATES ============
const PAGES = {};

PAGES.dashboard = () => `
<div class="page-head">
  <div>
    <div class="page-eyebrow">VISÃO GERAL · TEMPO REAL</div>
    <h1 class="page-title">Dashboard Operacional</h1>
    <div class="page-desc">${AIO.project.name} — ${AIO.project.municipio}/${AIO.project.uf} · ${AIO.project.bioma} · Área ${AIO.project.area_km2} km² · Altitude ≈ ${AIO.project.altitude_m} m</div>
  </div>
  <div class="page-meta">Campanha atual: ${AIO.project.campanha_atual}<br>Última sincronização: <span id="dashSyncTime">—</span></div>
</div>

<div class="section-label">INDICADORES DE SUSTENTABILIDADE · FONTES REAIS</div>
<div class="grid g-4">
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-fire"></i> Índice de Queimadas</span><span class="card-tag" id="fireSource">INPE</span></div>
    <div class="kpi-value" id="fireCount">—</div>
    <div class="kpi-trend" id="fireRisk">consultando BDQueimadas...</div>
    <div class="kpi-note" id="fireNote">Focos de calor nas últimas 24-48h no raio de ${AIO.fire.radius_km} km de Caraúbas-PB (INPE BDQueimadas).</div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-water"></i> Carga Hidrológica</span><span class="card-tag">SIMULAÇÃO REAL</span></div>
    <div class="kpi-value" id="hydroQ">—</div>
    <div class="kpi-trend" id="hydroClass">vazão calculada...</div>
    <div class="kpi-note" id="hydroNote">Rio Paraíba — trecho ${AIO.hydro.trecho} (${AIO.hydro.trecho_km} km). Modelo Q = A × V: área molhada ${AIO.hydro.geom.area_m2} m² × velocidade média da água, estimada pela pluviosidade real (Open-Meteo).</div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-droplet-slash"></i> Evapotranspiração ETo</span><span class="card-tag">OPEN-METEO</span></div>
    <div class="kpi-value" id="etoVal">—</div>
    <div class="kpi-trend" id="etoSub">últimas 24h</div>
    <canvas class="kpi-spark" id="sparkEto" style="height:34px;margin-top:8px"></canvas>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-tree"></i> Estimativa de Árvores</span><span class="card-tag">MODELO CAATINGA</span></div>
    <div class="kpi-value" id="treesVal" style="font-size:24px">—</div>
    <div class="kpi-trend" id="treesSub">área de ${AIO.project.area_km2} km²</div>
    <div class="kpi-note" id="treesNote">Densidade Caatinga (Cariri) × cobertura real NDVI.</div>
  </div>
</div>

<div class="section-label">VISOR · CARGA HIDROLÓGICA DA BACIA</div>
<div class="card visor-card">
  <div class="grid g-12">
    <div class="visor-main" style="grid-column:span 5">
      <div class="visor-label">VAZÃO CALCULADA — ${AIO.hydro.rio} · ${AIO.hydro.trecho}</div>
      <div class="visor-value" id="hydroVisorQ">—</div>
      <div class="visor-extra" id="hydroVisorVol">volume 24h: —</div>
      <div class="status-badge" id="hydroVisorClass" style="margin-top:8px;display:inline-block">AGUARDANDO DADOS</div>
      <div class="visor-facts" id="hydroVisorFacts"></div>
    </div>
    <div style="grid-column:span 7">
      <div id="hydroChart" style="height:220px"></div>
    </div>
  </div>
  <div class="visor-foot" id="hydroVisorFoot"></div>
</div>

<div class="section-label">CONDIÇÕES ATUAIS · TEMPO REAL (CARAÚBAS-PB)</div>
<div class="grid g-4">
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-temperature-half"></i> Temperatura</span></div><div id="gaugeTemp" style="height:150px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-droplet"></i> Umidade Relativa</span></div><div id="gaugeHum" style="height:150px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-wind"></i> Vento</span></div><div id="gaugeWind" style="height:150px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-sun"></i> Índice UV</span></div><div id="gaugeUV" style="height:150px"></div></div>
</div>

<div class="grid g-12" style="margin-top:16px">
  <div class="card" style="grid-column:span 8">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-chart-line"></i> Evolução dos Índices Espectrais</span><span class="card-tag">5 CAMPANHAS</span></div>
    <div id="chartIndicesEvo" style="height:260px"></div>
    <div class="source-foot">NDVI = export real Sentinel-2 (github.com/kraefegg/AIO) · NDWI/Moisture/BSI = séries-modelo até export numérico disponível.</div>
  </div>
  <div class="card" style="grid-column:span 4">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> Painel de Alertas</span></div>
    <div id="dashAlerts"></div>
  </div>
</div>

<div class="grid g-2" style="margin-top:16px">
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-recycle"></i> Status da Recuperação Ambiental</span></div>
    <div class="status-row"><span>Talhão A — Setor Norte</span><span class="status-badge ok">EM RECUPERAÇÃO</span></div>
    <div class="pbar" style="margin-bottom:10px"><div class="pbar-fill" style="width:64%"></div></div>
    <div class="status-row"><span>Talhão B — Setor Central</span><span class="status-badge warn">ATENÇÃO</span></div>
    <div class="pbar" style="margin-bottom:10px"><div class="pbar-fill" style="width:41%"></div></div>
    <div class="status-row"><span>Talhão C — Setor Sul</span><span class="status-badge ok">EM RECUPERAÇÃO</span></div>
    <div class="pbar"><div class="pbar-fill" style="width:57%"></div></div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-gauge"></i> Indicadores de Sustentabilidade</span></div>
    <div id="chartSustain" style="height:220px"></div>
  </div>
</div>
`;

PAGES.meteorologia = () => `
<div class="page-head">
  <div><div class="page-eyebrow">DADOS EM TEMPO REAL · OPEN-METEO</div><h1 class="page-title">Painel Meteorológico</h1>
  <div class="page-desc">Estação virtual — Caraúbas/PB (${AIO.project.cordenada_label}) · Atualização automática a cada 10 min</div></div>
  <button class="btn-hud" id="refreshWeather"><i class="fa-solid fa-rotate"></i> Atualizar agora</button>
</div>
<div id="weatherGrid" class="grid g-4">
  ${Array.from({length:16}).map(()=>`<div class="card"><div class="skel" style="height:70px"></div></div>`).join('')}
</div>
<div class="section-label">INSTRUMENTOS</div>
<div class="grid g-4">
  <div class="card"><div class="card-head"><span class="card-title">Termômetro</span></div><div id="instTherm" style="height:170px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title">Barômetro</span></div><div id="instBaro" style="height:170px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title">Anemômetro</span></div><div id="instAnem" style="height:170px"></div></div>
  <div class="card"><div class="card-head"><span class="card-title">Rosa dos Ventos</span></div><div id="instRose" style="height:170px"></div></div>
</div>
<div class="section-label">ESTAÇÃO DE CAMPO · KIT IoT — PoC M1</div>
<div class="grid g-5">
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-temperature-half"></i> Temperatura Local</span><span class="card-tag">SENSOR</span></div><div class="kpi-value" id="telTemp">—</div><div class="kpi-note">SHT31 a 2 m</div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-droplet"></i> Umidade Local</span><span class="card-tag">SENSOR</span></div><div class="kpi-value" id="telHum">—</div><div class="kpi-note">SHT31</div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-gauge"></i> Pressão</span><span class="card-tag">SENSOR</span></div><div class="kpi-value" id="telPress">—</div><div class="kpi-note">BMP280</div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-wind"></i> Vento</span><span class="card-tag">SENSOR</span></div><div class="kpi-value" id="telWind">—</div><div class="kpi-note">anemômetro + cata-vento</div></div>
  <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid fa-battery-three-quarters"></i> Energia</span><span class="card-tag">TELEMETRIA</span></div><div class="kpi-value" id="telBat">—</div><div class="kpi-note" id="telNote">dispositivo aguardando envio</div></div>
</div>
<div class="section-label">PREVISÃO 7 DIAS</div>
<div class="card"><div id="chartForecast" style="height:280px"></div></div>
`;

PAGES.climatologia = () => `
<div class="page-head"><div><div class="page-eyebrow">SÉRIE HISTÓRICA · NORMAIS 1991-2020</div><h1 class="page-title">Climatologia</h1>
<div class="page-desc">Normais climatológicas de referência do Sertão/Cariri Paraibano e anomalias do ano corrente — Caraúbas/PB</div></div></div>
<div class="grid g-3">
  <div class="card"><div class="card-head"><span class="card-title">Precipitação Acumulada Anual</span></div><div class="kpi-value">612<span class="kpi-unit">mm</span></div><div class="kpi-trend down"><i class="fa-solid fa-arrow-trend-down"></i> -14% vs normal 1991-2020</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Temperatura Média Anual</span></div><div class="kpi-value">27.8<span class="kpi-unit">°C</span></div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> +1.2°C vs normal 1991-2020</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Evapotranspiração (ETo)</span></div><div class="kpi-value">1840<span class="kpi-unit">mm/ano</span></div><div class="kpi-trend flat"><i class="fa-solid fa-minus"></i> estável</div></div>
</div>
<div class="section-label">SÉRIE TEMPORAL — 12 MESES</div>
<div class="card"><div id="chartClima" style="height:300px"></div></div>
<div class="section-label">COMPARAÇÃO HISTÓRICA (NORMAIS × OBSERVADO)</div>
<div class="grid g-2">
  <div class="card"><div id="chartAnomalyTemp" style="height:240px"></div></div>
  <div class="card"><div id="chartAnomalyChuva" style="height:240px"></div></div>
</div>
`;

PAGES.vegetacao = () => `
<div class="page-head"><div><div class="page-eyebrow">SUPERFÍCIE · ÍNDICES ESPECTRAIS</div><h1 class="page-title">Vegetação</h1>
<div class="page-desc">Monitoramento de vigor e cobertura vegetal — NDVI real (Sentinel-2) + amostras de campo</div></div></div>
<div class="grid g-4">
  <div class="card"><div class="card-head"><span class="card-title">NDVI Médio</span></div><div class="kpi-value" id="vegNdvival">0.42</div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> série real Sentinel-2</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Cobertura Vegetal</span></div><div class="kpi-value" id="vegCobVal">46.5<span class="kpi-unit">%</span></div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> estimada do NDVI</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Área Vegetada</span></div><div class="kpi-value" id="vegAreaVal">—</div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> km² com cobertura</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Regeneração Natural</span></div><div class="kpi-value">62<span class="kpi-unit">%</span></div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> das áreas monitoradas</div></div>
</div>
<div class="section-label">EVOLUÇÃO NDVI / EVI POR CAMPANHA</div>
<div class="card"><div id="chartVeg" style="height:300px"></div></div>
<div class="section-label">DISTRIBUIÇÃO POR ESPÉCIE (AMOSTRA DE CAMPO)</div>
<div class="card"><div id="chartSpecies" style="height:280px"></div></div>
`;

PAGES.solo = () => `
<div class="page-head"><div><div class="page-eyebrow">SUPERFÍCIE · EDAFOLOGIA</div><h1 class="page-title">Solo</h1>
<div class="page-desc">Fração de solo exposto (Barren Soil Index) e condições edafológicas do Cariri</div></div></div>
<div class="grid g-4">
  <div class="card"><div class="card-head"><span class="card-title">Solo Exposto (BSI)</span></div><div class="kpi-value">45.0<span class="kpi-unit">%</span></div><div class="kpi-trend down"><i class="fa-solid fa-arrow-trend-down"></i> -6.7% vs anterior</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Umidade do Solo (0-10cm)</span></div><div class="kpi-value" id="soloUmiVal">18.2<span class="kpi-unit">%</span></div><div class="kpi-trend flat"><i class="fa-solid fa-minus"></i> estável</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Compactação Média</span></div><div class="kpi-value">2.1<span class="kpi-unit">MPa</span></div><div class="kpi-trend down"><i class="fa-solid fa-arrow-trend-down"></i> dentro do limite crítico</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Textura Predominante</span></div><div class="kpi-value" style="font-size:20px">Franco-Arenosa</div></div>
</div>
<div class="section-label">EVOLUÇÃO DO SOLO EXPOSTO (BSI) × COBERTURA</div>
<div class="card"><div id="chartSolo" style="height:280px"></div></div>
`;

PAGES.hidrico = () => `
<div class="page-head"><div><div class="page-eyebrow">SUPERFÍCIE · RECURSOS HÍDRICOS</div><h1 class="page-title">Recursos Hídricos</h1>
<div class="page-desc">NDWI, áreas úmidas e o regime do ${AIO.hydro.rio} — análise da bacia (afluentes: ${AIO.hydro.afluentes.join(', ')})</div></div></div>
<div class="grid g-4">
  <div class="card"><div class="card-head"><span class="card-title">NDWI Médio</span></div><div class="kpi-value">0.18</div><div class="kpi-trend up"><i class="fa-solid fa-arrow-trend-up"></i> +2.1%</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Vazão Calculada</span></div><div class="kpi-value" id="hidQVal">—</div><div class="kpi-trend" id="hidQSub">simulação real (Open-Meteo)</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Bacia a Montante</span></div><div class="kpi-value" style="font-size:20px">${AIO.hydro.bacia_km2} km²</div><div class="kpi-trend flat"><i class="fa-solid fa-minus"></i> área de drenagem</div></div>
  <div class="card"><div class="card-head"><span class="card-title">Curso Principal</span></div><div class="kpi-value" style="font-size:18px">Rio Paraíba</div><div class="kpi-trend flat"><i class="fa-solid fa-minus"></i> Alto Curso</div></div>
</div>
<div class="section-label">EVOLUÇÃO NDWI</div>
<div class="card"><div id="chartHidrico" style="height:280px"></div></div>
`;

PAGES.sensoriamento = () => `
<div class="page-head"><div><div class="page-eyebrow">OBSERVAÇÃO DA TERRA · SENTINEL-2 L2A · github.com/kraefegg/AIO</div><h1 class="page-title">Sensoriamento Remoto</h1>
<div class="page-desc">Timelapses reais Sentinel-2 do repositório do projeto. O painel NDVI tem exportação CSV estatística real; os demais são vídeos sem série numérica.</div></div></div>
<div class="card" style="margin-bottom:16px">
  <div class="card-head"><span class="card-title"><i class="fa-solid fa-cloud-arrow-up"></i> Visualizar arquivo próprio</span><span class="card-tag">UPLOAD</span></div>
  <div class="dropzone" id="rsDropzone" style="padding:18px">
    <i class="fa-solid fa-image"></i>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--ink-1)">Envie um GIF/imagem (timelapse) ou um CSV de estatísticas (colunas data + mean) para visualização local.</div>
    <input type="file" id="rsUpload" accept=".gif,.png,.jpg,.jpeg,.webp,.csv,.txt" style="display:none">
  </div>
  <div id="rsUploadOutput" style="margin-top:10px"></div>
</div>
<div class="grid g-2" id="rsGrid"></div>
`;

PAGES.mapas = () => `
<div class="page-head"><div><div class="page-eyebrow">GIS INTEGRADO</div><h1 class="page-title">Mapas</h1>
<div class="page-desc">Sistema de informação geográfica — importe seu polígono (KML, KMZ ou GeoJSON) da área PRAD Caraúbas/PB</div></div></div>
<div class="grid g-3" style="margin-bottom:16px">
  <div class="card" style="grid-column:span 2">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-file-import"></i> Importar Polígono</span></div>
    <div class="dropzone" id="mapDropzone" style="padding:20px">
      <i class="fa-solid fa-map-location-dot"></i>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--ink-1)">Arraste KML, KMZ ou JSON (GeoJSON) aqui ou clique para selecionar.</div>
      <input type="file" id="mapUpload" accept=".kml,.kmz,.json,.geojson,.txt" style="display:none">
    </div>
    <div class="map-tools">
      <button class="btn-hud sm" id="mapClearUpload"><i class="fa-solid fa-trash"></i> Remover camada importada</button>
      <span class="map-status" id="mapUploadStatus"></span>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-circle-info"></i> Dica</span></div>
    <p style="font-size:12px;color:var(--ink-2);line-height:1.6">O ponto fixo da sede foi removido. Ative o polígono PRAD padrão pelo botão abaixo ou importe o seu próprio arquivo delimitador da área de 5,73 km².</p>
  </div>
</div>
<div class="card">
  <div id="leafletMap"></div>
  <div class="map-layers">
    <span class="chip-toggle on" data-layer="osm"><i class="fa-solid fa-map"></i> OpenStreetMap</span>
    <span class="chip-toggle" data-layer="sat"><i class="fa-solid fa-satellite"></i> ESRI Satellite</span>
    <span class="chip-toggle" data-layer="topo"><i class="fa-solid fa-mountain"></i> Topográfico</span>
    <span class="chip-toggle" data-layer="poly"><i class="fa-solid fa-draw-polygon"></i> Polígono PRAD</span>
    <span class="chip-toggle" data-layer="fire"><i class="fa-solid fa-fire"></i> Focos de Calor (INPE)</span>
  </div>
</div>
`;

PAGES.csv = () => `
<div class="page-head"><div><div class="page-eyebrow">INGESTÃO DE DADOS</div><h1 class="page-title">Dados CSV</h1>
<div class="page-desc">Upload manual de arquivos .CSV ou exports NDVI (Sentinel-2) do repositório — tabela, filtros, gráficos e resumo estatístico automáticos</div></div></div>
<div class="grid g-3" style="margin-bottom:16px">
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-cloud-arrow-up"></i> Upload manual</span></div>
    <div class="dropzone" id="dropzone">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--ink-1)">Arraste um arquivo .CSV aqui ou clique para selecionar</div>
      <input type="file" id="csvInput" accept=".csv,.txt" style="display:none">
    </div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-file-csv"></i> Formato esperado</span><span class="card-tag">PADRÃO</span></div>
    <p style="font-size:12px;color:var(--ink-2);margin-bottom:8px;line-height:1.6">Qualquer .CSV com cabeçalho funciona. Colunas <b>date/data</b> + <b>mean</b> geram série temporal e estatísticas; colunas <b>cloud</b> mostram qualidade das passagens; <b>status</b> gera gráfico de campo.</p>
    <p style="font-size:11.5px;color:var(--ink-2);line-height:1.6"><i class="fa-solid fa-circle-info"></i> Se seu arquivo está no Google Drive, baixe-o e use o upload manual — o app não lista pastas do Drive (limitação CORS).</p>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-brands fa-github"></i> Repositório kraefegg/AIO</span><span class="card-tag">NDVI · SENTINEL-2</span></div>
    <p style="font-size:12px;color:var(--ink-2);margin-bottom:10px">Export NDVI (Sentinel Hub Statistical API) por janela temporal:</p>
    <select class="btn-hud" id="ndviRepoSelect" style="width:100%;text-align:left">
      ${AIO.ndviDatasets.map((d,i)=>`<option value="${i}" ${i===0?'selected':''}>${d.label}</option>`).join('')}
    </select>
    <button class="btn-hud sm" id="loadNdviRepo" style="margin-top:10px"><i class="fa-solid fa-download"></i> Carregar do GitHub</button>
  </div>
</div>
<div id="csvOutput" style="margin-top:6px"></div>
`;

PAGES.relatorios = () => {
  const deleted = (typeof AIOApp !== 'undefined' && AIOApp.deletedReports) ? AIOApp.deletedReports() : [];
  const visible = AIO.campaigns.filter(c=>!deleted.includes(c));
  return `
<div class="page-head"><div><div class="page-eyebrow">EXPORTAÇÃO</div><h1 class="page-title">Relatórios</h1>
<div class="page-desc">Geração automática de relatórios mensais de monitoramento — exportação real (CSV/JSON) e impressão em PDF</div></div>
<button class="btn-hud" onclick="AIOApp.restoreReports()"><i class="fa-solid fa-rotate-left"></i> Restaurar excluídos</button></div>
${visible.length===0?`<div class="card"><div class="card-title">Nenhum relatório disponível. Use "Restaurar excluídos" para recuperar.</div></div>`:''}
<div class="grid g-3">
  ${visible.map(c=>`
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-file-lines"></i> Campanha ${c}</span><span class="status-badge ok">DISPONÍVEL</span></div>
    <p style="font-size:12px;color:var(--ink-2)">Relatório técnico consolidado — indicadores reais, índices espectrais e status fitossanitário.</p>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn-hud sm" onclick="AIOApp.exportReport('PDF','${c}')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      <button class="btn-hud sm ghost" onclick="AIOApp.exportReport('CSV','${c}')"><i class="fa-solid fa-file-csv"></i> CSV</button>
      <button class="btn-hud sm ghost" onclick="AIOApp.exportReport('JSON','${c}')"><i class="fa-solid fa-file-code"></i> JSON</button>
      <button class="btn-hud sm danger" onclick="AIOApp.deleteReport('${c}')"><i class="fa-solid fa-trash"></i> Excluir</button>
    </div>
  </div>`).join('')}
</div>`;
};

PAGES.ia = () => `
<div class="page-head"><div><div class="page-eyebrow">MÓDULO INTELIGENTE</div><h1 class="page-title">Análise IA</h1>
<div class="page-desc">Interpretação automatizada dos indicadores ambientais reais — atualiza automaticamente conforme o tempo passa</div></div>
<button class="btn-hud" onclick="AIOApp.runAI()"><i class="fa-solid fa-wand-magic-sparkles"></i> Gerar nova análise</button></div>
<div class="card" id="iaPanel"></div>
`;

PAGES.config = () => `
<div class="page-head"><div><div class="page-eyebrow">SISTEMA</div><h1 class="page-title">Configurações</h1>
<div class="page-desc">Parâmetros do observatório e integrações externas</div></div></div>
<div class="grid g-2">
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-plug"></i> Integrações Externas</span></div>
    <div class="status-row"><span>Open-Meteo API (tempo real)</span><span class="status-badge ok">CONECTADO</span></div>
    <div class="status-row"><span><i class="fa-solid fa-fire"></i> INPE BDQueimadas</span><span class="status-badge ok">CONECTADO — focos 24-48h</span></div>
    <div class="status-row"><span><i class="fa-brands fa-github"></i> github.com/kraefegg/AIO</span><span class="status-badge ok">CONECTADO — NDVI + 6 GIFS</span></div>
    <div class="status-row"><span><i class="fa-solid fa-cloud-arrow-up"></i> Upload local de CSV/GIF</span><span class="status-badge ok">DISPONÍVEL</span></div>
    <div class="status-row"><span>Backend FastAPI / PostGIS</span><span class="status-badge warn">NÃO PROVISIONADO</span></div>
  </div>
  <div class="card">
    <div class="card-head"><span class="card-title"><i class="fa-solid fa-map-pin"></i> Parâmetros do Projeto</span></div>
    <div class="status-row"><span>Município</span><span>${AIO.project.municipio}/${AIO.project.uf}</span></div>
    <div class="status-row"><span>Área monitorada</span><span>${AIO.project.area_km2} km²</span></div>
    <div class="status-row"><span>Altitude média</span><span>≈ ${AIO.project.altitude_m} m</span></div>
    <div class="status-row"><span>Bioma</span><span>${AIO.project.bioma}</span></div>
    <div class="status-row"><span>Bacia (a montante)</span><span>${AIO.hydro.bacia_km2} km²</span></div>
    <div class="status-row"><span>Tema</span><span><button class="btn-hud sm" id="cfgTheme">Alternar claro/escuro</button></span></div>
  </div>
</div>
`;
