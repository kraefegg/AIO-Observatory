// ============ AIO OBSERVATORY — CORE DATA MODULE ============
const AIO = {
  project:{
    name:"PRAD Rio do Peixe I e II",
    municipio:"Caraúbas", uf:"PB", pais:"Brasil",
    area_km2:5.73, lat:-7.7283, lon:-36.4935,
    inicio:"2024-11", campanha_atual:"Julho/2026",
    bioma:"Caatinga (Cariri)",
    altitude_m:455,                     // altitude média do sítio (m) — Serra/Cariri
    raio_delimitado_km:3,               // raio de análise em torno da sede (km)
    cordenada_label:"07°43'42\"S 36°29'37\"W"
  },
  // Série de índices espectrais por campanha.
  // NDVI é substituído em runtime por dados reais do export Sentinel-2 (github.com/kraefegg/AIO);
  // os demais são séries-modelo até existirem exports numéricos no repositório.
  campaigns:["Mar/26","Abr/26","Mai/26","Jun/26","Jul/26"],
  indices:{
    ndvi:   [0.31,0.34,0.36,0.39,0.42],
    ndwi:   [0.12,0.14,0.13,0.16,0.18],
    moisture:[0.22,0.25,0.24,0.27,0.29],
    barren: [0.61,0.57,0.54,0.49,0.45],
  },
  kpi:{
    cobertura_vegetal_pct:46.5,        // atualizado pelo NDVI real quando disponível
    taxa_mortalidade_pct:11.2,
    area_recuperada_pct:52.0,
  },
  alerts:[
    {level:"warn", title:"Estiagem prolongada — Setor B", detail:"14 dias sem precipitação registrada > 1mm", time:"há 6h"},
    {level:"crit", title:"Herbivoria detectada — Talhão 3", detail:"Rebrota comprometida em 8% das mudas monitoradas", time:"há 1d"},
    {level:"info", title:"Campanha Jul/2026 concluída", detail:"Relatório mensal disponível para exportação", time:"há 2d"},
  ],

  // ---------- QUEIMADAS · INPE BDQUEIMADAS (fonte real, tempo quase-real) ----------
  fire:{
    radius_km:60,                       // raio de busca de focos em torno de Caraúbas-PB
    // Arquivos diários públicos do INPE (dataserver-coids) — CORS habilitado.
    dailyBase:"https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/focos_diario_br_",
    lookbackDays:2                      // quantos dias retroage (ontem + hoje)
  },

  // ---------- HIDROLOGIA · RIO PARAÍBA NO TRECHO DE CARAÚBAS (Congo → Caraúbas) ----------
  // Modelo de carga hidrológica Q = A × V, com geometria real do canal (levantamento
  // do trecho Congo → Caraúbas, 44,49 km) e velocidade média estimada a partir da
  // PLUVIOSIDADE REAL da região (Open-Meteo). Cenários de velocidade da literatura
  // do semiárido: 0,10 → 1,20 m/s conforme a chuva acumulada dos últimos 3 dias.
  hydro:{
    rio:"Rio Paraíba — trecho de Caraúbas-PB",
    trecho:"Congo → Caraúbas",
    trecho_km:44.49,                    // extensão do trecho monitorado (km)
    afluentes:["Rio Taperoá","Rio do Peixe","Riacho São Gonçalo","Riacho do Pombal"],
    bacia_km2:2600,                     // área de drenagem estimada a montante de Caraúbas (km²)
    geom:{                              // geometria média do canal (seção transversal)
      largura_m:3.8,                    // 2–5 m (60%) · 1–2 m (15%) · ≈6 m (25%) → média ponderada
      profundidade_m:1.9,               // 0,20 m (14%) · 1–2 m (69%) · até 5 m (17%) → média ponderada
      area_m2:7.2                       // A = 3,8 m × 1,9 m ≈ 7,2 m²
    },
    // Faixas de velocidade média (m/s) por pluviosidade real acumulada (mm — 3 dias)
    // e vazão correspondente em Q = 7,2 m² × V: 0,72 · 2,16 · 3,60 · 5,76 · 8,64 m³/s
    vel_por_chuva:[
      { chuva_mm:0,  v:0.10, rotulo:"Seca / estiagem" },
      { chuva_mm:1,  v:0.30, rotulo:"Chuva fraca recente" },
      { chuva_mm:5,  v:0.50, rotulo:"Chuva moderada" },
      { chuva_mm:20, v:0.80, rotulo:"Chuva forte recente" },
      { chuva_mm:50, v:1.20, rotulo:"Enxurrada / cheia" }
    ],
    runoff_coef:0.08,                   // escoamento da Caatinga (0.05–0.15) — referência
    precip_evap_factor:0.75             // fração da chuva evapotranspirada antes de escoar
  },

  // ---------- VEGETAÇÃO · ESTIMATIVA DE ÁRVORES (Caatinga do Cariri) ----------
  // Densidades médias de literatura para Caatinga regenerante (indivíduos/ha),
  // ajustadas em runtime pelo fator de cobertura real (NDVI Sentinel-2).
  trees:{
    density_per_ha:1800,                // área do PRAD (5,73 km²) — Caatinga arbustivo-arbórea
    radius_density_per_ha:1200,         // mosaico do entorno (raio delimitado)
    min_density_per_ha:600
  },

  // ---------- SENSORIAMENTO REMOTO (exports reais Sentinel-2 do repo kraefegg/AIO) ----------
  rsRepoBase:"https://raw.githubusercontent.com/kraefegg/AIO/main/",
  rsPanels:[
    {code:"NDVI", gif:"Sentinel-2_L2A-1065485713259736-timelapse.gif", title:"Índice de Vegetação por Diferença Normalizada",
      desc:"Vigor fotossintético da cobertura vegetal, calculado via Sentinel-2 L2A. Série estatística (CSV) real no repositório.", hasStats:true},
    {code:"MOISTURE", gif:"Sentinel-2_L2A-1112016969931582-timelapse.gif", title:"Índice de Umidade (Moisture Index)",
      desc:"Conteúdo de água na vegetação, derivado de bandas NIR/SWIR do Sentinel-2 L2A.", hasStats:false},
    {code:"MSI", gif:"Sentinel-2_L2A-1292750752764826-timelapse.gif", title:"Estresse por Umidade (Moisture Stress Index)",
      desc:"Sensibilidade da vegetação ao déficit hídrico — valores elevados indicam estresse por seca.", hasStats:false},
    {code:"BSI", gif:"Sentinel-2_L2A-1574036575296061-timelapse.gif", title:"Índice de Solo Exposto (Barren Soil Index)",
      desc:"Fração de solo exposto sem cobertura vegetal — indicador direto de progresso da recuperação.", hasStats:false},
    {code:"AGRI", gif:"Sentinel-2_L2A-228009384174236-timelapse.gif", title:"Índice de Vigor Agrícola (Agriculture)",
      desc:"Combinação espectral (NIR/SWIR/Red) para monitoramento de vigor em áreas de manejo e entorno.", hasStats:false},
    {code:"NDWI", gif:"Sentinel-2_L2A-291278969510833-timelapse.gif", title:"Índice de Água por Diferença Normalizada",
      desc:"Conteúdo de água em corpos hídricos superficiais e vegetação próximos à área de recuperação.", hasStats:false},
  ],
  // NDVI CSV exports disponíveis no repositório (Sentinel Hub Statistical API)
  ndviDatasets:[
    {label:"Histórico completo (2021–2026)", file:"Sentinel-2_L2A-3_NDVI-2021-08-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
    {label:"Últimos 2 anos (2024–2026)", file:"Sentinel-2_L2A-3_NDVI-2024-08-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
    {label:"Último ano (2025–2026)", file:"Sentinel-2_L2A-3_NDVI-2025-08-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
    {label:"Últimos 6 meses (Fev–Ago/2026)", file:"Sentinel-2_L2A-3_NDVI-2026-02-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
    {label:"Últimos 3 meses (Mai–Ago/2026)", file:"Sentinel-2_L2A-3_NDVI-2026-05-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
    {label:"Último mês (Jul–Ago/2026)", file:"Sentinel-2_L2A-3_NDVI-2026-07-02T00_00_00_000Z-2026-08-02T23_59_59_999Z.csv"},
  ],

  // ---------- DADOS OFICIAIS · INMET (base de cálculos Python, bridge/dados_dinamicos.py) ----------
  // O bridge gera telemetry/weather-oficial.json a partir das fontes oficiais do INMET
  // (estação automática mais próxima + previsão) e Open-Meteo. O app usa como fonte
  // preferencial o OCI Object Storage (URL pública, publicada pela ponte em
  // .github/workflows/oci-publish.yml) com fallback para o raw do GitHub.
  oficial:{
    source:"https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/gryamzqw4zsj/b/aio-telemetry/o/weather-oficial.json",
    fallback:"https://raw.githubusercontent.com/kraefegg/AIO-Observatory/main/telemetry/weather-oficial.json",
    ttl_ms:600000,                       // 10 min de frescura do payload
  },

  // ---------- TELEMETRIA IoT · KIT ESTAÇÃO METEOROLÓGICA (PoC M1) ----------
  // Contrato JSON publicado pelo firmware (firmware/station_weather.py) — ver docs/telemetry-contract.md.
  // A ponte MQTT→GitHub publica o último payload em telemetry/station-latest.json; a ponte OCI
  // (workflow oci-publish.yml) o espelha no container público aio-telemetry. O app tenta o OCI
  // primeiro e cai no raw do GitHub se o objeto não estiver disponível.
  // Se tudo falhar ou o dispositivo ainda não publicou, o app usa AIO.telemetry.sample
  // (dado-modelo), na mesma filosofia dos índices espectrais.
  sites:[
    { id:"car01", nome:"Caraúbas-01", tipo:"Estação Meteorológica Agro-Ambiental",
      lat:-7.7283, lon:-36.4935, alt_m:455, borda:"ESP32-S3", protocolo:"MQTT", firmware:"station_weather", instalacao:"PoC" }
  ],
  telemetry:{
    source:"https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/gryamzqw4zsj/b/aio-telemetry/o/station-latest.json",
    fallback:"https://raw.githubusercontent.com/kraefegg/AIO/main/telemetry/station-latest.json",
    ttl_ms:300000,                       // considera o payload fresco por 5 minutos
    sample:{                             // fallback offline / dispositivo inativo
      site:"car01", ts:"",
      metrics:{ temperature_c:27.4, humidity_pct:52, pressure_hpa:988,
        wind_speed_kmh:14.2, wind_gust_kmh:21.5, wind_dir_deg:135,
        rain_24h_mm:0.0, solar_mj_m2:18.4 },
      battery_v:4.1, rssi_dbm:-67
    }
  },
};

// SVG fallback frame (usado apenas se um GIF do repositório falhar — ex.: offline)
AIO.rsFrame = function(seed, hue){
  const c = hue||[160,190];
  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='640' height='400'>
    <defs>
      <linearGradient id='g${seed}' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='hsl(${c[0]},60%,10%)'/>
        <stop offset='100%' stop-color='hsl(${c[1]},70%,22%)'/>
      </linearGradient>
      <filter id='n${seed}'><feTurbulence baseFrequency='0.012 0.05' numOctaves='3' seed='${seed}' result='n'/><feColorMatrix in='n' type='matrix' values='0 0 0 0 0  0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0.35 0'/></filter>
    </defs>
    <rect width='640' height='400' fill='url(#g${seed})'/>
    <rect width='640' height='400' filter='url(#n${seed})' opacity='0.55'/>
    <g stroke='hsl(${c[1]},80%,60%)' stroke-width='0.4' opacity='0.25'>
      ${Array.from({length:8}).map((_,i)=>`<line x1='0' y1='${i*50}' x2='640' y2='${i*50}'/>`).join('')}
    </g>
  </svg>`);
};
