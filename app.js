// ============ AIO OBSERVATORY — APPLICATION CORE ============
const AIOApp = (() => {
  const LAT = AIO.project.lat, LON = AIO.project.lon;
  let weatherCache = null;
  const echartsInstances = {};
  const chartInstances = {};
  const ndviFileCache = {};

  // ---------- HELPERS ----------
  function setVal(id, html){
    const el = document.getElementById(id);
    if(el) el.innerHTML = html;
  }
  function fmtInt(n){ return Number(n||0).toLocaleString('pt-BR'); }

  // ---------- REPO NDVI DATA (github.com/kraefegg/AIO — real Sentinel-2 exports) ----------
  function sniffDateMean(rows){
    if(!rows.length) return {};
    const cols = Object.keys(rows[0]);
    const pick = re => cols.find(c => re.test(c));
    return {
      dateCol:  pick(/date/i) || pick(/^data$/i),
      meanCol:  pick(/mean/i)  || pick(/^ndvi$/i) || pick(/^evi$/i),
      minCol:   pick(/min/i),
      maxCol:   pick(/max/i),
      cloudCol: pick(/cloud/i)
    };
  }
  async function loadNDVIFile(file){
    if(ndviFileCache[file]) return ndviFileCache[file];
    const res = await fetch(AIO.rsRepoBase + encodeURIComponent(file));
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const parsed = Papa.parse(text, {header:true, dynamicTyping:true, skipEmptyLines:true});
    const s = sniffDateMean(parsed.data);
    const rows = parsed.data.map(r=>({
      date: r[s.dateCol], mean: r[s.meanCol], min: r[s.minCol], max: r[s.maxCol], cloud: r[s.cloudCol]
    })).filter(r=>r.date).sort((a,b)=> new Date(a.date)-new Date(b.date));
    ndviFileCache[file] = rows;
    return rows;
  }
  async function loadRealNDVITrend(){
    try{
      const rows = await loadNDVIFile(AIO.ndviDatasets[2].file);
      const clean = rows.filter(r=> (r.cloud===undefined || typeof r.cloud!=='number' || r.cloud<30) && typeof r.mean==='number');
      const byMonth = {};
      clean.forEach(r=>{ const k = String(r.date).slice(0,7); (byMonth[k]=byMonth[k]||[]).push(r.mean); });
      const months = Object.keys(byMonth).sort().slice(-5);
      if(months.length < 3) return;
      const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      AIO.campaigns = months.map(m=>{ const [y,mo]=m.split('-'); return MESES[+mo-1]+'/'+y.slice(2); });
      AIO.indices.ndvi = months.map(m=> +(byMonth[m].reduce((a,b)=>a+b,0)/byMonth[m].length).toFixed(3));
      AIO.kpi.cobertura_vegetal_pct = +Math.max(0,Math.min(100,(AIO.indices.ndvi[AIO.indices.ndvi.length-1]-0.08)*180)).toFixed(1);
      AIO._ndviIsReal = true;
    }catch(e){ /* keep synthetic fallback silently */ }
  }

  // ---------- BOOT SEQUENCE ----------
  function boot(){
    const logLines = [
      "INICIALIZANDO NÚCLEO AIO...",
      "CARREGANDO MÓDULOS GEOESPACIAIS...",
      "SINCRONIZANDO COM OPEN-METEO API...",
      "CONECTANDO INPE BDQUEIMADAS...",
      "MODELO HIDROLÓGICO DO RIO PARAÍBA...",
      "VALIDANDO POLÍGONO PRAD CARAÚBAS-PB...",
      "PRONTO."
    ];
    const logEl = document.getElementById('bootLog');
    const fill = document.getElementById('bootFill');
    let i=0;
    const iv = setInterval(()=>{
      if(i < logLines.length){
        const d = document.createElement('div');
        d.textContent = "> " + logLines[i];
        logEl.appendChild(d);
        fill.style.width = ((i+1)/logLines.length*100)+'%';
        i++;
      } else {
        clearInterval(iv);
        setTimeout(()=>{
          document.getElementById('boot-screen').style.transition = 'opacity .5s ease';
          document.getElementById('boot-screen').style.opacity = '0';
          setTimeout(()=>{
            document.getElementById('boot-screen').style.display='none';
            document.getElementById('app').style.display='flex';
            init();
          },500);
        },350);
      }
    }, 220);
  }

  // ---------- CLOCK ----------
  function tickClock(){
    const now = new Date();
    document.getElementById('clockTime').textContent = now.toLocaleTimeString('pt-BR');
    document.getElementById('clockDate').textContent = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  }

  // ---------- TOASTS ----------
  function toast(msg, icon='fa-circle-check'){
    let zone = document.getElementById('toastZone');
    if(!zone){ zone = document.createElement('div'); zone.id='toastZone'; document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = 'toast-hud animate__animated animate__fadeInUp';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    zone.appendChild(t);
    setTimeout(()=>{ t.classList.add('animate__fadeOutRight'); setTimeout(()=>t.remove(),400); }, 3200);
  }

  // ---------- NAVIGATION ----------
  function go(pageId){
    document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active', a.dataset.page===pageId));
    const content = document.getElementById('content');
    content.innerHTML = `<div class="page active" id="page-${pageId}">${PAGES[pageId]()}</div>`;
    renderPage(pageId);
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderPage(id){
    if(id==='dashboard') renderDashboard();
    if(id==='meteorologia') renderMeteorologia();
    if(id==='climatologia') renderClimatologia();
    if(id==='vegetacao') renderVegetacao();
    if(id==='solo') renderSolo();
    if(id==='hidrico') renderHidrico();
    if(id==='sensoriamento') renderSensoriamento();
    if(id==='mapas') renderMapa();
    if(id==='csv') renderCSVPage();
    if(id==='ia') runAI();
    if(id==='config') document.getElementById('cfgTheme')?.addEventListener('click', toggleTheme);
  }

  // ---------- ECHARTS HELPERS ----------
  function ec(elId){
    const el = document.getElementById(elId);
    if(!el) return null;
    if(echartsInstances[elId]) echartsInstances[elId].dispose();
    const inst = echarts.init(el, null, {renderer:'svg'});
    echartsInstances[elId] = inst;
    window.addEventListener('resize', ()=>inst.resize());
    return inst;
  }
  function spark(id, arr, color='#3fe0ff'){
    const el = document.getElementById(id);
    if(!el || !window.Chart) return;
    if(chartInstances[id]) chartInstances[id].destroy();
    chartInstances[id] = new Chart(el, {
      type:'line',
      data:{ labels:arr.map((_,i)=>i), datasets:[{data:arr, borderColor:color, borderWidth:2, pointRadius:0, tension:.4, fill:true, backgroundColor:color.replace(')',',.08)').replace('rgb','rgba')}]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:false},y:{display:false}} }
    });
  }
  const axisTheme = { color:'#5f7c90', fontFamily:'JetBrains Mono', fontSize:10 };
  const gridLine = { lineStyle:{ color:'rgba(120,200,255,.12)' } };
  function gauge(elId, value, max, unit, colorStops){
    const inst = ec(elId); if(!inst) return;
    inst.setOption({ series:[{
      type:'gauge', startAngle:210, endAngle:-30, min:0, max:max,
      progress:{show:true, width:10, itemStyle:{color: colorStops}},
      axisLine:{lineStyle:{width:10, color:[[1, 'rgba(255,255,255,.07)']]}},
      pointer:{show:false}, axisTick:{show:false}, splitLine:{show:false}, axisLabel:{show:false},
      anchor:{show:false},
      detail:{ valueAnimation:true, fontSize:22, fontFamily:'Orbitron', color:'#eaf6ff', offsetCenter:[0,'0%'], formatter:v=>v.toFixed(1)+unit },
      data:[{value:value}]
    }]});
  }

  // ---------- WEATHER (OPEN-METEO LIVE) ----------
  async function fetchWeather(){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day` +
      `&hourly=dew_point_2m,visibility,evapotranspiration,soil_temperature_0cm,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,shortwave_radiation_sum` +
      `&timezone=auto&forecast_days=7`;
    const t0 = performance.now();
    const res = await fetch(url);
    const data = await res.json();
    const ping = Math.round(performance.now()-t0);
    document.getElementById('apiPing') && (document.getElementById('apiPing').textContent = `ping ${ping}ms`);
    weatherCache = data;
    return data;
  }

  // ---------- DADOS OFICIAIS (INMET via bridge Python · fallback Open-Meteo) ----------
  // Fonte preferencial: telemetry/weather-oficial.json gerado por bridge/dados_dinamicos.py.
  // Se indisponível, consulta as APIs oficiais do INMET direto no navegador (CORS liberado
  // para o GitHub Pages); se nada responder, segue com o Open-Meteo (modelo).
  let oficialCache = null, oficialAt = 0;
  async function fetchOficial(){
    if(oficialCache && Date.now()-oficialAt < AIO.oficial.ttl_ms) return oficialCache;
    try{
      const res = await fetch(AIO.oficial.source + '?t=' + Date.now());
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if(!data || !data.calculos) throw new Error('schema inválido');
      oficialCache = data; oficialAt = Date.now();
      return data;
    }catch(e){
      const live = await fetchOficialINMET().catch(()=>null);
      if(live){ oficialCache = live; oficialAt = Date.now(); }
      return oficialCache || null;
    }
  }
  async function fetchOficialINMET(){
    // Estação automática mais próxima (Caraúbas-PB geocode 2504074) — dados em tempo real.
    const est = await fetch(`https://apiprevmet3.inmet.gov.br/estacao/proxima/2504074`).then(r=>r.json());
    const d = est.dados, s = est.estacao;
    if(!d || !s) throw new Error('INMET sem dados');
    const vel = +d.VEN_VEL||0, raj = +d.VEN_RAJ||0;
    return {
      fonte:`INMET estação ${s.CODIGO} (${s.NOME}, ${s.DISTANCIA_EM_KM} km) — em tempo real`,
      estacao:{ codigo:s.CODIGO, nome:s.NOME, uf:s.UF, distancia_km:s.DISTANCIA_EM_KM, medicao:`${d.DT_MEDICAO} ${d.HR_MEDICAO}` },
      atual:{ temperatura_c:+d.TEM_INS||0, umidade_pct:+d.UMD_INS||0, pressao_hpa:+d.PRE_INS||0,
        vento_kmh:+(vel*3.6).toFixed(1), rajada_kmh:+(raj*3.6).toFixed(1), vento_dir_deg:+d.VEN_DIR||0,
        chuva_mm:+d.CHUVA||0, temp_max_c:+d.TEM_MAX||0, temp_min_c:+d.TEM_MIN||0 },
      calculos:{ hidrologia:null, risco_fogo:null, arvores:null }
    };
  }
  // Preenche os cards "Condições Atuais" e os modelos derivados com a fonte oficial.
  async function applyOficial(){
    const o = await fetchOficial();
    if(!o) return;
    const a = o.atual;
    if(a){
      gauge('gaugeTemp', a.temperatura_c, 45, '°C', '#3fe0ff');
      gauge('gaugeHum', a.umidade_pct, 100, '%', '#12e0b0');
      gauge('gaugeWind', a.vento_kmh, 60, 'km/h', '#ffb545');
    }
    const c = o.calculos || {};
    if(c.hidrologia && c.hidrologia.q_m3s != null){
      const h = c.hidrologia;
      setVal('hydroQ', h.q_m3s + ' <span class="kpi-unit">m³/s</span>');
      setVal('hydroClass', `<i class="fa-solid fa-water"></i> ${h.classe} · chuva hoje ${(h.precip_hoje_mm||0).toFixed(1)} mm`);
      const vq = document.getElementById('hydroVisorQ');
      if(vq) vq.innerHTML = h.q_m3s + ' <span>m³/s</span>';
      setVal('hydroVisorVol', `Q = A × V · ${h.v_ms} m/s × ${h.area_m2} m² · volume 24h: ${fmtInt(h.vol_diario_m3)} m³`);
      const cl = document.getElementById('hydroVisorClass');
      if(cl){ cl.textContent = h.classe; cl.className = 'status-badge ' + (h.classe==='SECA'?'crit':h.classe==='CAUDAL ALTO'||h.classe==='EXTRAORDINÁRIO'?'warn':'ok'); }
    }
    if(c.eto_mm_dia != null){
      setVal('etoVal', c.eto_mm_dia + ' <span class="kpi-unit">mm/dia</span>');
      setVal('etoSub', `<i class="fa-solid fa-cloud-sun"></i> INMET · ${c.eto_metodo||'Hargreaves–Samani'}`);
    }
    if(c.arvores && c.arvores.arvores){
      setVal('treesVal', fmtInt(c.arvores.arvores) + ' <span class="kpi-unit">árvores</span>');
      setVal('treesSub', `<i class="fa-solid fa-seedling"></i> ${fmtInt(c.arvores.arvores_no_raio)} no raio de ${AIO.project.raio_delimitado_km} km`);
    }
    if(o.fonte){
      setVal('dashSyncTime', `${new Date().toLocaleTimeString('pt-BR')} · ${o.fonte}`);
      const src = document.getElementById('hydroNote');
      if(src) src.textContent = `Fonte oficial: ${o.fonte}. Modelo Q = A × V com dados INMET.`;
    }
  }

  // ---------- TELEMETRIA IoT · ESTAÇÃO DE CAMPO (PoC M1) ----------
  let telemetryCache = null, telemetryAt = 0;
  async function fetchStationTelemetry(){
    if(telemetryCache && Date.now()-telemetryAt < AIO.telemetry.ttl_ms) return telemetryCache;
    try{
      const res = await fetch(AIO.telemetry.source + '?t=' + Date.now());
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      telemetryCache = data; telemetryAt = Date.now();
      return data;
    }catch(e){ return telemetryCache || null; }
  }
  async function renderStationTelemetry(){
    if(!document.getElementById('telTemp')) return;
    const t = await fetchStationTelemetry();
    const m = (t && t.metrics) ? t.metrics : AIO.telemetry.sample.metrics;
    const fresh = !!(t && t.ts);
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('telTemp', m.temperature_c.toFixed(1)+'°C');
    set('telHum', m.humidity_pct.toFixed(0)+'%');
    set('telPress', m.pressure_hpa.toFixed(0)+' hPa');
    set('telWind', m.wind_speed_kmh.toFixed(1)+' km/h');
    set('telBat', m.battery_v.toFixed(2)+' V');
    const note = document.getElementById('telNote');
    if(note){
      note.textContent = fresh
        ? `último envio ${new Date(t.ts).toLocaleTimeString('pt-BR')} · RSSI ${t.rssi_dbm??'—'} dBm · ${(AIO.sites[0]||{}).id||'car01'}`
        : 'dado-modelo — nenhum dispositivo publicou ainda (ver firmware/station_weather.py)';
    }
  }

  function moonPhase(){
    const phases = ['🌑 Nova','🌒 Crescente','🌓 Quarto Crescente','🌔 Crescente Gibosa','🌕 Cheia','🌖 Minguante Gibosa','🌗 Quarto Minguante','🌘 Minguante'];
    const day = new Date().getDate();
    return phases[Math.floor((day/29.5)*8)%8];
  }
  function curHourIdx(d){
    const nowISO = new Date().toISOString().slice(0,13);
    let idx = d.hourly.time.findIndex(t=>t.startsWith(nowISO));
    return idx<0?0:idx;
  }

  async function renderMeteorologia(){
    let d;
    try{ d = weatherCache || await fetchWeather(); }
    catch(e){ document.getElementById('weatherGrid').innerHTML = `<div class="card">Falha ao consultar Open-Meteo. Verifique a conexão.</div>`; return; }
    const c = d.current, daily = d.daily;
    const items = [
      ["Temperatura do Ar", c.temperature_2m.toFixed(1)+"°C", "fa-temperature-half"],
      ["Temp. Máxima (hoje)", daily.temperature_2m_max[0].toFixed(1)+"°C", "fa-arrow-up"],
      ["Temp. Mínima (hoje)", daily.temperature_2m_min[0].toFixed(1)+"°C", "fa-arrow-down"],
      ["Temp. do Solo", ((d.hourly.soil_temperature_0cm[curHourIdx(d)]??'--')).toFixed?.(1)+"°C" || "—", "fa-mound"],
      ["Umidade Relativa", c.relative_humidity_2m+"%", "fa-droplet"],
      ["Pressão Atmosférica", c.pressure_msl.toFixed(0)+" hPa", "fa-gauge"],
      ["Velocidade do Vento", c.wind_speed_10m.toFixed(1)+" km/h", "fa-wind"],
      ["Rajadas", c.wind_gusts_10m.toFixed(1)+" km/h", "fa-tornado"],
      ["Direção do Vento", c.wind_direction_10m+"°", "fa-compass"],
      ["Ponto de Orvalho", (d.hourly.dew_point_2m[curHourIdx(d)]).toFixed(1)+"°C", "fa-water"],
      ["Precipitação (atual)", c.precipitation.toFixed(1)+" mm", "fa-cloud-rain"],
      ["Precip. Acumulada (hoje)", daily.precipitation_sum[0].toFixed(1)+" mm", "fa-cloud-showers-heavy"],
      ["Nebulosidade", c.cloud_cover+"%", "fa-cloud"],
      ["Índice UV", (daily.uv_index_max[0]).toFixed(1), "fa-sun"],
      ["Radiação Solar", (daily.shortwave_radiation_sum[0]).toFixed(1)+" MJ/m²", "fa-solar-panel"],
      ["Evapotranspiração", (d.hourly.evapotranspiration[curHourIdx(d)]).toFixed(2)+" mm", "fa-tint-slash"],
      ["Visibilidade", ((d.hourly.visibility[curHourIdx(d)])/1000).toFixed(1)+" km", "fa-eye"],
      ["Sensação Térmica", c.apparent_temperature.toFixed(1)+"°C", "fa-person-rays"],
      ["Nascer do Sol", new Date(daily.sunrise[0]).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), "fa-sun"],
      ["Pôr do Sol", new Date(daily.sunset[0]).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), "fa-moon"],
      ["Fase da Lua", moonPhase(), "fa-moon"],
    ];
    document.getElementById('weatherGrid').innerHTML = items.map(([label,val,ic])=>`
      <div class="card"><div class="card-head"><span class="card-title"><i class="fa-solid ${ic}"></i> ${label}</span></div>
      <div class="kpi-value" style="font-size:22px">${val}</div></div>`).join('');
    document.getElementById('dashSyncTime') && (document.getElementById('dashSyncTime').textContent = new Date().toLocaleTimeString('pt-BR'));
    renderStationTelemetry();

    gauge('instTherm', c.temperature_2m, 45, '°C', '#3fe0ff');
    gauge('instBaro', c.pressure_msl, 1050, 'hPa', '#12e0b0');
    gauge('instAnem', c.wind_speed_10m, 60, 'km/h', '#ffb545');
    renderWindRose('instRose', c.wind_direction_10m);

    const fc = ec('chartForecast');
    if(fc){
      fc.setOption({
        tooltip:{trigger:'axis'},
        legend:{textStyle:axisTheme, top:0},
        grid:{left:40,right:20,top:36,bottom:30},
        xAxis:{type:'category', data:daily.time.map(t=>new Date(t).toLocaleDateString('pt-BR',{weekday:'short'})), axisLabel:axisTheme, axisLine:gridLine},
        yAxis:[{type:'value', axisLabel:{...axisTheme, formatter:'{value}°C'}, splitLine:gridLine},
               {type:'value', axisLabel:{...axisTheme, formatter:'{value}mm'}, splitLine:{show:false}}],
        series:[
          {name:'Máx (°C)', type:'line', smooth:true, data:daily.temperature_2m_max, itemStyle:{color:'#ff4d5e'}, lineStyle:{width:2}},
          {name:'Mín (°C)', type:'line', smooth:true, data:daily.temperature_2m_min, itemStyle:{color:'#3fe0ff'}, lineStyle:{width:2}},
          {name:'Precip. (mm)', type:'bar', yAxisIndex:1, data:daily.precipitation_sum, itemStyle:{color:'rgba(18,224,176,.55)'}}
        ]
      });
    }
  }
  function renderWindRose(elId, deg){
    const inst = ec(elId); if(!inst) return;
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    const data = dirs.map((d,i)=> i===Math.round(deg/45)%8 ? 8 : Math.random()*3+1);
    inst.setOption({
      polar:{radius:'70%'},
      angleAxis:{type:'category', data:dirs, axisLabel:{...axisTheme,fontSize:9}, splitLine:{show:false}},
      radiusAxis:{show:false},
      series:[{type:'bar', coordinateSystem:'polar', data, itemStyle:{color:'#3fe0ff'}}]
    });
  }

  // ---------- INPE · QUEIMADAS (BDQueimadas — focos diários reais) ----------
  function inpeDailyUrl(d){
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,'0');
    const dd = String(d.getUTCDate()).padStart(2,'0');
    return AIO.fire.dailyBase + `${y}${m}${dd}.csv`;
  }
  function fireBBox(){
    return { minLat:LAT-0.6, maxLat:LAT+0.6, minLon:LON-0.9, maxLon:LON+0.9 };
  }
  async function fetchINPEFire(){
    const box = fireBBox();
    const days = [new Date()];
    const y = new Date(); y.setDate(y.getDate()-1); days.push(y);
    if(AIO.fire.lookbackDays > 2){ const z = new Date(); z.setDate(z.getDate()-2); days.push(z); }
    const seen = new Set();
    const foci = [];
    for(const d of days){
      try{
        const res = await fetch(inpeDailyUrl(d));
        if(!res.ok) continue;
        const text = await res.text();
        const parsed = Papa.parse(text, {header:true, skipEmptyLines:true});
        parsed.data.forEach(r=>{
          const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
          if(isNaN(lat)||isNaN(lon)) return;
          if(lat>=box.minLat && lat<=box.maxLat && lon>=box.minLon && lon<=box.maxLon){
            const key = r.id || (lat+','+lon+','+r.data_hora_gmt);
            if(!seen.has(key)){ seen.add(key); foci.push(r); }
          }
        });
      }catch(e){ /* tenta próximo dia */ }
    }
    return foci;
  }
  function dryDays(){
    const d = weatherCache; if(!d || !d.daily) return 0;
    const P = d.daily.precipitation_sum || [];
    let n=0;
    for(let i=0;i<P.length;i++){ if((P[i]||0) < 0.5) n++; else break; }
    return n;
  }
  function computeFireRiskFallback(){
    const c = weatherCache && weatherCache.current;
    if(!c) return null;
    let s = 0;
    s += c.temperature_2m > 32 ? 25 : c.temperature_2m > 28 ? 15 : 5;
    s += c.relative_humidity_2m < 30 ? 25 : c.relative_humidity_2m < 45 ? 15 : 5;
    s += c.wind_speed_10m > 25 ? 15 : c.wind_speed_10m > 15 ? 8 : 3;
    s += Math.min(dryDays()*3, 25);
    s += (weatherCache.daily && (weatherCache.daily.precipitation_sum[0]||0) < 0.5) ? 10 : 0;
    return { index:Math.min(100, Math.round(s)), daysDry:dryDays() };
  }
  async function updateFireCard(){
    const el = document.getElementById('fireCount');
    if(!el) return;
    try{
      const foci = await fetchINPEFire();
      const risk = foci.length ? Math.max(...foci.map(f=>parseFloat(f.risco_fogo)||0)) : 0;
      const frp   = Math.max(...foci.map(f=>parseFloat(f.frp)||0));
      const biomas = {};
      foci.forEach(f=>{ biomas[f.bioma] = (biomas[f.bioma]||0)+1; });
      const caatinga = biomas['Caatinga'] || biomas['CAATINGA'] || 0;
      el.textContent = fmtInt(foci.length);
      setVal('fireRisk', foci.length
        ? `<i class="fa-solid fa-triangle-exclamation"></i> risco INPE ${(risk*100).toFixed(0)}%` + (frp ? ` · FRP máx ${frp.toFixed(0)} MW` : '')
        : `<i class="fa-solid fa-circle-check"></i> nenhum foco ativo no raio`);
      setVal('fireNote', `Focos de calor (INPE BDQueimadas) nas últimas 24-48h num raio de ${AIO.fire.radius_km} km de Caraúbas-PB. Caatinga: ${caatinga} foco(s). Atualizado: ${new Date().toLocaleTimeString('pt-BR')}.`);
      setVal('fireSource', 'INPE · LIVE');
      document.getElementById('fireSource') && document.getElementById('fireSource').classList.add('live-tag');
      AIO._fire = { foci, count:foci.length, risk, source:'inpe' };
      return;
    }catch(e){}
    const fb = computeFireRiskFallback();
    if(fb){
      el.textContent = fb.index + '%';
      setVal('fireRisk', `<i class="fa-solid fa-calculator"></i> risco meteorológico computado`);
      setVal('fireNote', `INPE indisponível no momento (offline). Risco derivado de temperatura, umidade, vento e ${fb.daysDry} dia(s) sem chuva (Open-Meteo).`);
      setVal('fireSource', 'MODELO');
      AIO._fire = { count:null, risk:fb.index, source:'model' };
    } else {
      el.textContent = '—';
    }
  }

  // ---------- HIDROLOGIA · RIO PARAÍBA (Q = A × V · pluviosidade real Open-Meteo) ----------
  // Série real de precipitação (7 dias passados + hoje) carregada à parte, sem afetar
  // os índices das demais páginas que usam o cache principal de clima.
  let precipCache = null;
  async function fetchHydroPrecip(){
    try{
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=auto`);
      const d = await r.json();
      precipCache = { time:d.daily.time || [], sum:d.daily.precipitation_sum || [] };
    }catch(e){ precipCache = null; }
  }
  // Velocidade média da água (m/s) a partir da pluviosidade acumulada (mm),
  // interpolação linear sobre as faixas reais do trecho (0,10 → 1,20 m/s).
  function velFromRain(mm){
    const t = AIO.hydro.vel_por_chuva;
    if(mm <= t[0].chuva_mm) return t[0].v;
    for(let i=1;i<t.length;i++){
      if(mm <= t[i].chuva_mm){
        const a=t[i-1], b=t[i];
        return a.v + (b.v - a.v) * ((mm - a.chuva_mm) / (b.chuva_mm - a.chuva_mm || 1));
      }
    }
    return t[t.length-1].v;
  }
  function computeHydro(){
    const d = weatherCache; if(!d || !d.daily) return null;
    const g = AIO.hydro.geom;
    // Precipitação real: usa a série com passado (fetchHydroPrecip) quando disponível;
    // senão, cai para a previsão do cache principal (índice 0 = hoje).
    let P, T, todayIdx, usePast;
    if(precipCache && precipCache.sum.length >= 3){
      P = precipCache.sum; T = precipCache.time; todayIdx = P.length - 1; usePast = true;
    } else {
      P = d.daily.precipitation_sum || []; T = d.daily.time || []; todayIdx = 0; usePast = false;
    }
    const p0 = P[todayIdx]||0, p1 = P[todayIdx-1]||0, p2 = P[todayIdx-2]||0;
    const idx = 0.5*p0 + 0.3*p1 + 0.2*p2;              // pluviosidade acumulada recente (mm)
    const V = +velFromRain(idx).toFixed(3);             // velocidade média (m/s)
    const Q = +(g.area_m2 * V).toFixed(2);              // vazão Q = A × V (m³/s)
    const volToday = Math.round(Q * 86400);
    const series=[], labels=[];
    const start = usePast ? Math.max(0, P.length-7) : 0;
    for(let i=start; i<P.length; i++){
      const vi = +velFromRain(P[i]||0).toFixed(3);
      series.push(+(g.area_m2 * vi).toFixed(2));
      labels.push(new Date(T[i]).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}));
    }
    let cls = 'SECA';
    if(Q < 1) cls = 'SECA';
    else if(Q < 2.5) cls = 'CAUDAL BAIXO';
    else if(Q < 5) cls = 'REGIME NORMAL';
    else if(Q < 8) cls = 'CAUDAL ALTO';
    else cls = 'EXTRAORDINÁRIO';
    const rot = [...AIO.hydro.vel_por_chuva].reverse().find(r=> idx >= r.chuva_mm) || AIO.hydro.vel_por_chuva[0];
    return { Q, V, A:g.area_m2, largura:g.largura_m, profundidade:g.profundidade_m,
      idx, precipToday:p0, series, labels, cls, volToday, rotulo:rot.rotulo };
  }
  function updateHydroCard(){
    const h = computeHydro(); if(!h) return;
    setVal('hydroQ', h.Q + ' <span class="kpi-unit">m³/s</span>');
    setVal('hydroClass', `<i class="fa-solid fa-water"></i> ${h.cls} · chuva hoje ${h.precipToday.toFixed(1)} mm`);
    const visorQ = document.getElementById('hydroVisorQ');
    if(visorQ) visorQ.innerHTML = h.Q + ' <span>m³/s</span>';
    setVal('hydroVisorVol', `Q = A × V · ${h.V} m/s × ${h.A.toFixed(1)} m² · volume 24h: ${fmtInt(h.volToday)} m³`);
    const cls = document.getElementById('hydroVisorClass');
    if(cls){ cls.textContent = h.cls; cls.className = 'status-badge ' + (h.cls==='SECA'?'crit':h.cls==='CAUDAL ALTO'||h.cls==='EXTRAORDINÁRIO'?'warn':'ok'); }
    setVal('hydroVisorFacts',
      `<span>Trecho: <b>${AIO.hydro.trecho} (${AIO.hydro.trecho_km} km)</b></span>` +
      `<span>Largura: <b>${h.largura.toFixed(1)} m</b></span>` +
      `<span>Profundidade: <b>${h.profundidade.toFixed(1)} m</b></span>` +
      `<span>Área molhada: <b>${h.A.toFixed(1)} m²</b></span>` +
      `<span>Velocidade: <b>${h.V} m/s</b></span>` +
      `<span>Bacia: <b>${fmtInt(AIO.hydro.bacia_km2)} km²</b></span>`);
    setVal('hydroVisorFoot', `Modelo ${h.rotulo} (${h.V} m/s): Q = A × V = ${h.A.toFixed(1)} m² × ${h.V} m/s = ${h.Q} m³/s. Pluviosidade real dos últimos 3 dias (${h.idx.toFixed(1)} mm) via Open-Meteo para o trecho ${AIO.hydro.rio}. Afluentes considerados: ${AIO.hydro.afluentes.join(', ')}.`);
    const ch = ec('hydroChart');
    if(ch){
      ch.setOption({
        tooltip:{trigger:'axis', valueFormatter:v=>v+' m³/s'},
        grid:{left:42,right:14,top:16,bottom:26},
        xAxis:{type:'category', data:h.labels, axisLabel:axisTheme, axisLine:gridLine},
        yAxis:{type:'value', axisLabel:{...axisTheme, formatter:'{value}'}, splitLine:gridLine},
        series:[{name:'Vazão modelada (m³/s)', type:'bar', data:h.series, itemStyle:{color:'rgba(63,224,255,.7)'},
          lineStyle:{color:'#3fe0ff', width:2}, smooth:true}]
      });
    }
  }

  // ---------- EVAPOTRANSPIRAÇÃO (dados reais Open-Meteo) ----------
  function computeETo(){
    const d = weatherCache; if(!d || !d.hourly) return null;
    const hv = d.hourly.evapotranspiration || [];
    const t = d.hourly.time || [];
    const iso = new Date().toISOString().slice(0,13);
    let idx = t.findIndex(x=>x.startsWith(iso)); if(idx<0) idx = t.length-1;
    let sum = 0;
    for(let i=Math.max(0, idx-23); i<=idx; i++){ if(typeof hv[i]==='number') sum += hv[i]; }
    return { mmDay:+sum.toFixed(2), hv, idx };
  }
  function updateEToCard(){
    const e = computeETo(); if(!e) return;
    setVal('etoVal', e.mmDay + ' <span class="kpi-unit">mm/dia</span>');
    setVal('etoSub', `<i class="fa-solid fa-temperature-half"></i> base: temperatura real · últimas 24h`);
    spark('sparkEto', e.hv.slice(Math.max(0,e.idx-23), e.idx+1).map(v=>typeof v==='number'?v:0), '#12e0b0');
  }

  // ---------- VEGETAÇÃO · ESTIMATIVA DE ÁRVORES (Caatinga/Cariri) ----------
  function computeTrees(){
    const ndvi = AIO.indices.ndvi[AIO.indices.ndvi.length-1];
    const cov = Math.max(0.15, Math.min(1, (ndvi-0.1)/0.5));
    const ha = AIO.project.area_km2*100;
    const trees = Math.round(ha * AIO.trees.density_per_ha * cov);
    const r = AIO.project.raio_delimitado_km;
    const circleHa = Math.PI*r*r*100;
    const treesRadius = Math.round(circleHa * AIO.trees.radius_density_per_ha * cov);
    return { trees, treesRadius, cov, ha, ndvi };
  }
  function updateTreesCard(){
    const t = computeTrees(); if(!t) return;
    setVal('treesVal', fmtInt(t.trees) + ' <span class="kpi-unit">árvores</span>');
    setVal('treesSub', `<i class="fa-solid fa-seedling"></i> ${fmtInt(t.treesRadius)} no raio de ${AIO.project.raio_delimitado_km} km (${(Math.PI*AIO.project.raio_delimitado_km*AIO.project.raio_delimitado_km).toFixed(2)} km²)`);
    setVal('treesNote', `Modelo: ${fmtInt(AIO.trees.density_per_ha)} ind/ha (Caatinga arbustivo-arbórea do Cariri) × cobertura real NDVI ${(t.cov*100).toFixed(0)}% · ${fmtInt(t.ha)} ha.`);
  }

  // ---------- DASHBOARD ----------
  async function renderDashboard(){
    try{ if(!weatherCache) await fetchWeather(); }catch(e){}
    const c = weatherCache && weatherCache.current;

    // CONDIÇÕES ATUAIS — tempo real (Caraúbas-PB)
    if(c){
      gauge('gaugeTemp', c.temperature_2m, 45, '°C', '#3fe0ff');
      gauge('gaugeHum', c.relative_humidity_2m, 100, '%', '#12e0b0');
      gauge('gaugeWind', c.wind_speed_10m, 60, 'km/h', '#ffb545');
      gauge('gaugeUV', weatherCache.daily.uv_index_max[0], 12, '', '#ff4d5e');
      setVal('dashSyncTime', new Date().toLocaleTimeString('pt-BR'));
    }

    // Indicadores reais / simulados
    updateFireCard();
    updateHydroCard();
    if(!precipCache) fetchHydroPrecip().then(()=>updateHydroCard());   // série real de chuva p/ Q=A×V
    updateEToCard();
    updateTreesCard();
    applyOficial();                                                    // fonte preferencial INMET (bridge Python)

    // Evolução dos índices espectrais (NDVI real quando disponível)
    const evo = ec('chartIndicesEvo');
    if(evo){
      evo.setOption({
        tooltip:{trigger:'axis'}, legend:{textStyle:axisTheme, top:0},
        grid:{left:36,right:16,top:36,bottom:26},
        xAxis:{type:'category', data:AIO.campaigns, axisLabel:axisTheme, axisLine:gridLine},
        yAxis:{type:'value', axisLabel:axisTheme, splitLine:gridLine},
        series:[
          {name:'NDVI'+(AIO._ndviIsReal?' (real)':''), type:'line', smooth:true, data:AIO.indices.ndvi, itemStyle:{color:'#12e0b0'}, areaStyle:{opacity:.08}},
          {name:'NDWI', type:'line', smooth:true, data:AIO.indices.ndwi, itemStyle:{color:'#3fe0ff'}},
          {name:'Moisture', type:'line', smooth:true, data:AIO.indices.moisture, itemStyle:{color:'#8a7dff'}},
          {name:'Barren Soil', type:'line', smooth:true, data:AIO.indices.barren, itemStyle:{color:'#ffb545'}},
        ]
      });
    }

    // Painel de alertas
    setVal('dashAlerts', AIO.alerts.map(a=>`
      <div class="alert-item"><div class="alert-ico ${a.level}"><i class="fa-solid ${a.level==='crit'?'fa-triangle-exclamation':a.level==='warn'?'fa-cloud-sun-rain':'fa-circle-info'}"></i></div>
      <div class="alert-body"><strong>${a.title}</strong><span>${a.detail} · ${a.time}</span></div></div>`).join(''));

    // Radar de sustentabilidade
    const sus = ec('chartSustain');
    if(sus){
      sus.setOption({
        radar:{ indicator:[{name:'Cobertura Vegetal',max:100},{name:'Retenção Hídrica',max:100},{name:'Fitossanidade',max:100},{name:'Recuperação Solo',max:100},{name:'Biodiversidade',max:100}],
          axisName:{color:'#5f7c90', fontSize:10}, splitLine:{lineStyle:{color:'rgba(120,200,255,.14)'}}, splitArea:{show:false}, axisLine:{lineStyle:{color:'rgba(120,200,255,.14)'}} },
        series:[{type:'radar', data:[{value:[AIO.kpi.cobertura_vegetal_pct,58,71,55,49], areaStyle:{color:'rgba(63,224,255,.18)'}, itemStyle:{color:'#3fe0ff'}, lineStyle:{color:'#3fe0ff'}}]}]
      });
    }
  }

  // ---------- CLIMATOLOGIA ----------
  function renderClimatologia(){
    const months = ['Ago','Set','Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun','Jul'];
    const temp = [28.1,28.9,29.4,29.0,28.2,27.5,27.1,26.8,26.5,27.0,27.6,27.9];
    const normalTemp = [27.2,27.6,28.0,27.8,27.3,26.9,26.6,26.3,26.1,26.5,27.0,27.2];
    const chuva = [4,2,8,22,61,98,112,89,54,20,6,3];
    const normalChuva = [8,5,12,30,72,105,120,95,60,25,10,6];
    const cl = ec('chartClima');
    if(cl){ cl.setOption({
      tooltip:{trigger:'axis'}, legend:{textStyle:axisTheme, top:0},
      grid:{left:40,right:20,top:36,bottom:26},
      xAxis:{type:'category', data:months, axisLabel:axisTheme, axisLine:gridLine},
      yAxis:[{type:'value', axisLabel:{...axisTheme,formatter:'{value}°C'}, splitLine:gridLine},{type:'value', axisLabel:{...axisTheme,formatter:'{value}mm'}, splitLine:{show:false}}],
      series:[
        {name:'Temp. Observada', type:'line', smooth:true, data:temp, itemStyle:{color:'#ff4d5e'}},
        {name:'Temp. Normal', type:'line', smooth:true, data:normalTemp, itemStyle:{color:'#ffb545'}, lineStyle:{type:'dashed'}},
        {name:'Precipitação', type:'bar', yAxisIndex:1, data:chuva, itemStyle:{color:'rgba(63,224,255,.5)'}},
      ]}); }
    const at = ec('chartAnomalyTemp');
    if(at){ const anomaly = temp.map((t,i)=>+(t-normalTemp[i]).toFixed(1));
      at.setOption({ title:{text:'Anomalia de Temperatura', textStyle:{...axisTheme,fontSize:12,color:'#eaf6ff'}},
        grid:{left:36,right:16,top:44,bottom:26}, tooltip:{trigger:'axis'},
        xAxis:{type:'category', data:months, axisLabel:axisTheme, axisLine:gridLine}, yAxis:{type:'value', axisLabel:{...axisTheme,formatter:'{value}°C'}, splitLine:gridLine},
        series:[{type:'bar', data:anomaly, itemStyle:{color:p=>p.value>=0?'#ff4d5e':'#3fe0ff'}}] }); }
    const ac = ec('chartAnomalyChuva');
    if(ac){ const anomaly = chuva.map((c,i)=>c-normalChuva[i]);
      ac.setOption({ title:{text:'Anomalia de Precipitação', textStyle:{...axisTheme,fontSize:12,color:'#eaf6ff'}},
        grid:{left:36,right:16,top:44,bottom:26}, tooltip:{trigger:'axis'},
        xAxis:{type:'category', data:months, axisLabel:axisTheme, axisLine:gridLine}, yAxis:{type:'value', axisLabel:{...axisTheme,formatter:'{value}mm'}, splitLine:gridLine},
        series:[{type:'bar', data:anomaly, itemStyle:{color:p=>p.value>=0?'#12e0b0':'#ffb545'}}] }); }
  }

  // ---------- VEGETAÇÃO ----------
  function renderVegetacao(){
    const v = ec('chartVeg');
    if(v){ v.setOption({
      tooltip:{trigger:'axis'}, legend:{textStyle:axisTheme, top:0},
      grid:{left:36,right:16,top:36,bottom:26},
      xAxis:{type:'category', data:AIO.campaigns, axisLabel:axisTheme, axisLine:gridLine},
      yAxis:{type:'value', axisLabel:axisTheme, splitLine:gridLine, max:0.6},
      series:[
        {name:'NDVI'+(AIO._ndviIsReal?' (real)':''), type:'line', smooth:true, areaStyle:{opacity:.1}, data:AIO.indices.ndvi, itemStyle:{color:'#12e0b0'}},
        {name:'EVI', type:'line', smooth:true, data:[0.24,0.27,0.29,0.31,0.33], itemStyle:{color:'#8a7dff'}},
      ]}); }
    const ndvi = AIO.indices.ndvi[AIO.indices.ndvi.length-1];
    setVal('vegNdvival', ndvi.toFixed(2));
    setVal('vegCobVal', AIO.kpi.cobertura_vegetal_pct + '<span class="kpi-unit">%</span>');
    setVal('vegAreaVal', (AIO.kpi.cobertura_vegetal_pct/100*AIO.project.area_km2).toFixed(2) + '<span class="kpi-unit"> km²</span>');
    const sp = ec('chartSpecies');
    if(sp){
      const rows = Papa.parse(AIO.sampleCSV,{header:true}).data.filter(r=>r.especie);
      const counts = {}; rows.forEach(r=>counts[r.especie]=(counts[r.especie]||0)+1);
      sp.setOption({
        tooltip:{trigger:'item'},
        series:[{type:'pie', radius:['40%','72%'], itemStyle:{borderColor:'#081420', borderWidth:2},
          label:{color:'#a9c4d6', fontSize:11},
          data:Object.entries(counts).map(([name,value])=>({name,value})),
          color:['#3fe0ff','#12e0b0','#8a7dff','#ffb545']
        }]});
    }
  }

  // ---------- SOLO ----------
  function renderSolo(){
    const s = ec('chartSolo');
    if(s){ s.setOption({
      tooltip:{trigger:'axis'}, legend:{textStyle:axisTheme, top:0},
      grid:{left:40,right:16,top:36,bottom:26},
      xAxis:{type:'category', data:AIO.campaigns, axisLabel:axisTheme, axisLine:gridLine},
      yAxis:{type:'value', axisLabel:axisTheme, splitLine:gridLine, max:0.7},
      series:[
        {name:'Barren Soil Index', type:'bar', data:AIO.indices.barren, itemStyle:{color:'rgba(255,181,69,.6)'}},
        {name:'Cobertura Vegetal', type:'line', smooth:true, data:AIO.indices.ndvi.map(v=>v+0.05), itemStyle:{color:'#12e0b0'}},
      ]}); }
  }

  // ---------- HÍDRICO ----------
  function renderHidrico(){
    const h = computeHydro();
    if(h){ setVal('hidQVal', h.Q + ' <span class="kpi-unit">m³/s</span>'); setVal('hidQSub', `${h.cls} · ${h.V} m/s · chuva ${h.precipToday.toFixed(1)} mm · Q = A × V (pluviosidade real Open-Meteo)`); }
    const hc = ec('chartHidrico');
    if(hc){ hc.setOption({
      tooltip:{trigger:'axis'}, grid:{left:36,right:16,top:20,bottom:26},
      xAxis:{type:'category', data:AIO.campaigns, axisLabel:axisTheme, axisLine:gridLine},
      yAxis:{type:'value', axisLabel:axisTheme, splitLine:gridLine},
      series:[{name:'NDWI', type:'line', smooth:true, areaStyle:{opacity:.12}, data:AIO.indices.ndwi, itemStyle:{color:'#3fe0ff'}}]
    }); }
  }

  // ---------- SENSORIAMENTO REMOTO ----------
  function renderSensoriamento(){
    const grid = document.getElementById('rsGrid');
    grid.innerHTML = AIO.rsPanels.map((p,i)=>`
      <div class="card rs-card">
        <div class="rs-media">
          <img src="${AIO.rsRepoBase + encodeURIComponent(p.gif)}" alt="${p.code}"
               onerror="this.onerror=null;this.src='${AIO.rsFrame(i+1,[150+i*20,190+i*15])}'">
          <span class="rs-badge">${p.code}</span>
          <div class="rs-controls">
            <a href="${AIO.rsRepoBase + encodeURIComponent(p.gif)}" target="_blank" style="text-decoration:none"><button title="Abrir GIF original"><i class="fa-solid fa-up-right-from-square"></i></button></a>
            <button onclick="this.closest('.rs-media').requestFullscreen && this.closest('.rs-media').requestFullscreen()"><i class="fa-solid fa-expand"></i></button>
            <span class="rs-date">SENTINEL-2 L2A · TIMELAPSE REAL</span>
          </div>
        </div>
        <div class="rs-body">
          <div class="rs-title">${p.title}</div>
          <div class="rs-desc">${p.desc}</div>
          <div id="rsStats-${p.code}"></div>
        </div>
      </div>`).join('');

    // Painel NDVI: estatísticas reais do export do repositório
    const ndviPanel = AIO.rsPanels.find(p=>p.hasStats);
    const target = document.getElementById(`rsStats-${ndviPanel.code}`);
    target.innerHTML = `<div class="skel" style="height:70px"></div>`;
    loadNDVIFile(AIO.ndviDatasets[0].file).then(rows=>{
      const clean = rows.filter(r=> (r.cloud===undefined || typeof r.cloud!=='number' || r.cloud<30) && typeof r.mean==='number');
      const means = clean.map(r=>r.mean);
      const mean = means.reduce((a,b)=>a+b,0)/Math.max(1,means.length);
      const max = Math.max(...means), min = Math.min(...means);
      const last12 = clean.slice(-12), prev12 = clean.slice(-24,-12);
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b.mean,0)/arr.length : 0;
      const trend = prev12.length ? avg(last12) - avg(prev12) : 0;
      target.innerHTML = `
        <div class="rs-stats">
          <div class="rs-stat"><b>${mean.toFixed(2)}</b><span>Médio (limpo)</span></div>
          <div class="rs-stat"><b>${max.toFixed(2)}</b><span>Máximo</span></div>
          <div class="rs-stat"><b>${min.toFixed(2)}</b><span>Mínimo</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px;font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2)">
          <span>Amostras válidas: <b style="color:var(--cyan)">${clean.length}/${rows.length}</b></span>
          <span>·</span><span>Tendência 12 vs 12 obs.: <b style="color:${trend>=0?'var(--teal)':'var(--red)'}">${trend>=0?'+':''}${trend.toFixed(3)}</b></span>
        </div>
        <div class="rs-interp"><i class="fa-solid fa-robot"></i> Série real Sentinel-2 L2A, ${rows.length} passagens, ${clean.length} com nuvem &lt;30%. ${trend>0?'Tendência positiva de NDVI — consistente com regeneração da cobertura vegetal.':'Tendência estável/levemente negativa — cruzar com precipitação do período.'}</div>`;
    }).catch(()=>{
      target.innerHTML = `<div class="rs-interp"><i class="fa-solid fa-triangle-exclamation"></i> Falha ao carregar CSV do repositório (conexão/CORS). Use o upload acima para visualizar seu próprio arquivo, ou <a href="#" style="color:var(--cyan)" onclick="AIOApp.go('sensoriamento');return false">tente novamente</a>.</div>`;
    });

    AIO.rsPanels.filter(p=>!p.hasStats).forEach(p=>{
      document.getElementById(`rsStats-${p.code}`).innerHTML =
        `<div class="rs-interp"><i class="fa-solid fa-circle-info"></i> Sem exportação CSV estatística no repositório — apenas o timelapse visual. Envie seu próprio CSV na opção de upload para ver estatísticas aqui.</div>`;
    });

    // Upload local (imagem/GIF ou CSV de estatísticas)
    const dz = document.getElementById('rsDropzone');
    const input = document.getElementById('rsUpload');
    dz.addEventListener('click', ()=>input.click());
    dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); if(e.dataTransfer.files[0]) handleRSFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', e=>{ if(e.target.files[0]) handleRSFile(e.target.files[0]); });
  }
  function handleRSFile(file){
    const out = document.getElementById('rsUploadOutput');
    const ext = file.name.split('.').pop().toLowerCase();
    if(['png','jpg','jpeg','gif','webp'].includes(ext)){
      const reader = new FileReader();
      reader.onload = e=>{
        out.innerHTML = `<div class="rs-card" style="padding:0"><div class="rs-media" style="aspect-ratio:auto;min-height:120px"><img src="${e.target.result}" alt="upload"></div><div class="rs-body rs-title">${file.name}</div></div>`;
        toast('Imagem carregada: '+file.name, 'fa-image');
      };
      reader.readAsDataURL(file);
    } else if(ext==='csv' || ext==='txt'){
      const reader = new FileReader();
      reader.onload = e=>{
        renderInlineCSV(e.target.result, file.name, out);
        toast('CSV carregado: '+file.name, 'fa-file-csv');
      };
      reader.readAsText(file);
    } else {
      toast('Formato não suportado', 'fa-triangle-exclamation');
    }
  }
  function renderInlineCSV(text, filename, container){
    const parsed = Papa.parse(text, {header:true, dynamicTyping:true, skipEmptyLines:true});
    const rows = parsed.data, cols = parsed.meta.fields || [];
    const numCols = cols.filter(c=>rows.every(r=>typeof r[c]==='number'||r[c]==null));
    const meanCol = numCols.find(c=>/mean/i.test(c)) || numCols[0];
    const dateCol = cols.find(c=>/date/i.test(c));
    let stats = '';
    if(meanCol && numCols.length){
      const vals = rows.map(r=>r[meanCol]).filter(v=>typeof v==='number');
      const mean = vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);
      const mx = Math.max(...vals), mn = Math.min(...vals);
      stats = `<div class="rs-stats">
        <div class="rs-stat"><b>${mean.toFixed(2)}</b><span>Médio</span></div>
        <div class="rs-stat"><b>${mx.toFixed(2)}</b><span>Máximo</span></div>
        <div class="rs-stat"><b>${mn.toFixed(2)}</b><span>Mínimo</span></div></div>`;
    }
    const head = rows.slice(0,8).map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('');
    container.innerHTML = `
      <div class="card">
        <div class="card-head"><span class="card-title"><i class="fa-solid fa-file-csv"></i> ${filename}</span><span class="card-tag">${rows.length} REGISTROS</span></div>
        ${stats||'<div class="rs-interp"><i class="fa-solid fa-circle-info"></i> Sem coluna numérica detectada.</div>'}
        <div style="overflow:auto;max-height:200px"><table class="table-hud"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${head}</tbody></table></div>
      </div>`;
  }

  // ---------- MAPA ----------
  let mapInst=null, layers={}, polyLayer=null, uploadedLayer=null, fireLayer=null;
  function renderMapa(){
    if(mapInst){ mapInst.remove(); mapInst=null; }
    mapInst = L.map('leafletMap').setView([LAT,LON], 12);
    layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'});
    layers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri'});
    layers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'© OpenTopoMap'});
    layers.osm.addTo(mapInst);
    const poly = [[LAT+0.012,LON-0.02],[LAT+0.014,LON+0.018],[LAT-0.01,LON+0.022],[LAT-0.015,LON-0.015]];
    polyLayer = L.polygon(poly,{color:'#3fe0ff', weight:2, fillColor:'#3fe0ff', fillOpacity:.12}).bindPopup(`<b>${AIO.project.name}</b><br>Área: ${AIO.project.area_km2} km²`);

    document.querySelectorAll('.chip-toggle').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        const key = chip.dataset.layer;
        if(key==='poly'){
          if(mapInst.hasLayer(polyLayer)){ mapInst.removeLayer(polyLayer); chip.classList.remove('on'); }
          else { polyLayer.addTo(mapInst); chip.classList.add('on'); }
          return;
        }
        if(key==='fire'){
          if(mapInst.hasLayer(fireLayer)){ mapInst.removeLayer(fireLayer); chip.classList.remove('on'); }
          else { fireLayer = L.geoJSON(fireGeoJSON(), {
              pointToLayer:(fe,ll)=>L.circleMarker(ll,{radius:5,color:'#ff4d5e',fillColor:'#ff4d5e',fillOpacity:.6,weight:1}),
              onEachFeature:(fe,l)=>l.bindPopup(`<b>Foco de calor</b><br>Satélite: ${fe.properties.sat||'-'}<br>Risco: ${fe.properties.risco?((+fe.properties.risco)*100).toFixed(0)+'%':'-'}<br>FRP: ${fe.properties.frp||'-'} MW<br>${fe.properties.data||''}`)
            }).addTo(mapInst); chip.classList.add('on'); }
          return;
        }
        document.querySelectorAll('.chip-toggle[data-layer]').forEach(c=>{ if(['osm','sat','topo'].includes(c.dataset.layer)) c.classList.remove('on'); });
        Object.entries(layers).forEach(([k,l])=>{ if(mapInst.hasLayer(l)) mapInst.removeLayer(l); });
        layers[key].addTo(mapInst); chip.classList.add('on');
      });
    });

    // Upload KML / KMZ / JSON
    const dz = document.getElementById('mapDropzone');
    const input = document.getElementById('mapUpload');
    dz.addEventListener('click', ()=>input.click());
    dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); if(e.dataTransfer.files[0]) handleMapFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', e=>{ if(e.target.files[0]) handleMapFile(e.target.files[0]); });
    document.getElementById('mapClearUpload').addEventListener('click', ()=>{
      if(uploadedLayer){ mapInst.removeLayer(uploadedLayer); uploadedLayer=null; }
      setVal('mapUploadStatus', '');
      toast('Camada importada removida', 'fa-trash');
    });
    setTimeout(()=>mapInst.invalidateSize(),200);
  }
  function mapStatus(msg){
    const el = document.getElementById('mapUploadStatus');
    if(el) el.textContent = msg;
  }
  function handleMapFile(file){
    const ext = file.name.split('.').pop().toLowerCase();
    try{
      if(ext==='kmz'){
        mapStatus('Lendo KMZ...');
        JSZip.loadAsync(file.arrayBuffer()).then(zip=>{
          const k = Object.keys(zip.files).find(f=>/\.kml$/i.test(f));
          if(!k) throw new Error('KMZ sem arquivo .kml');
          return zip.files[k].async('string');
        }).then(parseKML).catch(e=>{ mapStatus('Falha no KMZ: '+e.message); toast('Falha ao ler KMZ','fa-triangle-exclamation'); });
      } else if(ext==='kml' || ext==='txt'){
        file.text().then(parseKML).catch(e=>{ mapStatus('Falha no KML: '+e.message); });
      } else if(ext==='json' || ext==='geojson'){
        file.text().then(t=>{ addUploadedGeoJSON(JSON.parse(t), file.name); })
          .catch(e=>{ mapStatus('JSON inválido: '+e.message); });
      } else {
        mapStatus('Formato não suportado: '+ext);
      }
    }catch(e){ mapStatus('Erro: '+e.message); }
  }
  function parseKML(text){
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    if(xml.querySelector('parsererror')) throw new Error('KML inválido');
    let gj = null;
    if(window.togeojson){
      gj = togeojson.kml(xml);
      if(!gj || !gj.features || !gj.features.length) throw new Error('Nenhuma geometria no KML');
    } else {
      gj = legacyKML(text);
    }
    addUploadedGeoJSON(gj, 'arquivo KML');
  }
  function legacyKML(text){
    const m = text.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if(!m) throw new Error('Polígono não encontrado no KML');
    const ring = m[1].trim().split(/\s+/).map(p=>{
      const c = p.split(',').map(Number);
      return [c[0], c[1]];
    }).filter(c=>!isNaN(c[0]) && !isNaN(c[1]));
    if(ring.length < 3) throw new Error('Polígono inválido');
    return { type:'Feature', geometry:{ type:'Polygon', coordinates:[ring] }, properties:{} };
  }
  function addUploadedGeoJSON(gj, name){
    if(uploadedLayer){ mapInst.removeLayer(uploadedLayer); }
    uploadedLayer = L.geoJSON(gj, { style:{ color:'#12e0b0', weight:2, fillColor:'#12e0b0', fillOpacity:.12 },
      onEachFeature:(fe,l)=>{ if(fe.properties && fe.properties.name) l.bindPopup('<b>'+fe.properties.name+'</b>'); }
    }).addTo(mapInst);
    const b = uploadedLayer.getBounds();
    if(b.isValid()) mapInst.fitBounds(b);
    mapStatus('✔ Polígono importado: ' + name + ' (' + uploadedLayer.getLayers().length + ' geometria(s))');
    toast('Polígono importado: ' + name, 'fa-map-location-dot');
  }
  function fireGeoJSON(){
    const foci = (AIO._fire && AIO._fire.foci) || [];
    return { type:'FeatureCollection', features: foci.filter(f=>!isNaN(parseFloat(f.lat))&&!isNaN(parseFloat(f.lon))).map(f=>({
      type:'Feature', geometry:{ type:'Point', coordinates:[parseFloat(f.lon), parseFloat(f.lat)] },
      properties:{ risco:f.risco_fogo||'', frp:f.frp||'', sat:f.satelite||'', data:f.data_hora_gmt||'' }
    }))};
  }

  // ---------- CSV MODULE ----------
  function renderCSVPage(){
    const dz = document.getElementById('dropzone');
    dz.addEventListener('click', ()=>document.getElementById('csvInput').click());
    dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); if(e.dataTransfer.files[0]) parseCSVFile(e.dataTransfer.files[0]); });
    document.getElementById('csvInput').addEventListener('change', e=>{ if(e.target.files[0]) parseCSVFile(e.target.files[0]); });
    document.getElementById('loadNdviRepo').addEventListener('click', loadSelectedRepoCSV);
    loadSelectedRepoCSV();
  }
  function loadSelectedRepoCSV(){
    const idx = +document.getElementById('ndviRepoSelect').value;
    const ds = AIO.ndviDatasets[idx];
    const out = document.getElementById('csvOutput');
    out.innerHTML = `<div class="card"><div class="skel" style="height:120px"></div></div>`;
    fetch(AIO.rsRepoBase + encodeURIComponent(ds.file)).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
      .then(text=>processCSV(text, ds.file))
      .catch(()=>{ out.innerHTML = `<div class="card">Falha ao buscar <b>${ds.file}</b> no repositório (conexão/CORS). Alternativa: baixe o arquivo do GitHub e use o upload manual. <button class="btn-hud sm" style="margin-top:8px" onclick="AIOApp.toast('Recarregando...');AIOApp.go('csv')">Tentar novamente</button></div>`; });
  }
  function parseCSVFile(file){
    const reader = new FileReader();
    reader.onload = e => processCSV(e.target.result, file.name);
    reader.readAsText(file);
  }
  function processCSV(text, filename){
    const parsed = Papa.parse(text, {header:true, dynamicTyping:true, skipEmptyLines:true});
    const rows = parsed.data, cols = parsed.meta.fields || [];
    const numCols = cols.filter(c => rows.every(r=>typeof r[c]==='number' || r[c]==null));
    const stats = {};
    numCols.forEach(c=>{
      const vals = rows.map(r=>r[c]).filter(v=>typeof v==='number');
      if(!vals.length) return;
      const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
      const sorted=[...vals].sort((a,b)=>a-b);
      const median = sorted[Math.floor(sorted.length/2)];
      const sd = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
      stats[c] = {mean,median,max:Math.max(...vals),min:Math.min(...vals),sd,n:vals.length};
    });

    const out = document.getElementById('csvOutput');
    out.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="card-title"><i class="fa-solid fa-file-csv"></i> ${filename}</span><span class="card-tag">${rows.length} REGISTROS</span></div>
        <div class="grid g-4" id="csvStats"></div>
      </div>
      <div class="grid g-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><span class="card-title" id="csvChart1Title">Distribuição</span></div><div id="csvChart1" style="height:240px"></div></div>
        <div class="card"><div class="card-head"><span class="card-title" id="csvChart2Title">Composição</span></div><div id="csvChart2" style="height:240px"></div></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Tabela Dinâmica</span></div>
        <input class="btn-hud" style="width:100%;margin-bottom:10px;text-align:left" id="csvSearch" placeholder="🔍 Pesquisar registros...">
        <div style="overflow:auto;max-height:340px"><table class="table-hud" id="csvTable"></table></div>
      </div>`;

    document.getElementById('csvStats').innerHTML = numCols.slice(0,4).map(c=>`
      <div class="card"><div class="card-title" style="margin-bottom:8px">${c}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--ink-1);line-height:1.8">
        Média: <b style="color:var(--cyan)">${stats[c].mean.toFixed(2)}</b><br>
        Mediana: <b>${stats[c].median.toFixed(2)}</b><br>
        Máx/Mín: <b>${stats[c].max}</b> / <b>${stats[c].min}</b><br>
        Desvio Padrão: <b>${stats[c].sd.toFixed(2)}</b></div></div>`).join('');

    const dateCol = cols.find(c=>c.toLowerCase().includes('date')||c.toLowerCase().includes('data'));
    const meanCol = numCols.find(c=>c.toLowerCase().includes('mean')) || numCols[0];
    if(meanCol){
      document.getElementById('csvChart1Title').textContent = dateCol ? `Série Temporal — ${meanCol}` : `Distribuição — ${meanCol}`;
      const c1 = ec('csvChart1');
      const sortedRows = dateCol ? [...rows].sort((a,b)=>new Date(a[dateCol])-new Date(b[dateCol])) : rows;
      const xData = dateCol ? sortedRows.map(r=>String(r[dateCol]).slice(0,10)) : rows.map((r,i)=>r.ponto||i);
      const yData = dateCol ? sortedRows.map(r=>r[meanCol]) : rows.map(r=>r[meanCol]);
      c1?.setOption({ tooltip:{trigger:'axis'}, grid:{left:36,right:16,top:16,bottom:40},
        xAxis:{type:'category', data:xData, axisLabel:{...axisTheme,fontSize:8,rotate:dateCol?45:0}, axisLine:gridLine},
        yAxis:{type:'value', axisLabel:axisTheme, splitLine:gridLine},
        series:[{type:dateCol?'line':'bar', smooth:true, data:yData, itemStyle:{color:'#3fe0ff'}, areaStyle:dateCol?{opacity:.1}:undefined}] });
    }
    const statusCol = cols.find(c=>c.toLowerCase().includes('status'));
    const cloudCol = cols.find(c=>c.toLowerCase().includes('cloud'));
    if(statusCol){
      document.getElementById('csvChart2Title').textContent = 'Status de Campo';
      const counts={}; rows.forEach(r=>counts[r[statusCol]]=(counts[r[statusCol]]||0)+1);
      const c2 = ec('csvChart2');
      c2?.setOption({ tooltip:{trigger:'item'}, series:[{type:'pie', radius:['45%','75%'],
        label:{color:'#a9c4d6',fontSize:11}, data:Object.entries(counts).map(([name,value])=>({name,value})),
        color:['#12e0b0','#ffb545','#ff4d5e'] }] });
    } else if(cloudCol){
      document.getElementById('csvChart2Title').textContent = 'Cobertura de Nuvens por Passagem';
      const buckets = {'<10%':0,'10-30%':0,'30-70%':0,'>70%':0};
      rows.forEach(r=>{ const v=r[cloudCol]; if(typeof v!=='number') return;
        if(v<10) buckets['<10%']++; else if(v<30) buckets['10-30%']++; else if(v<70) buckets['30-70%']++; else buckets['>70%']++; });
      const c2 = ec('csvChart2');
      c2?.setOption({ tooltip:{trigger:'item'}, series:[{type:'pie', radius:['45%','75%'],
        label:{color:'#a9c4d6',fontSize:11}, data:Object.entries(buckets).map(([name,value])=>({name,value})),
        color:['#12e0b0','#3fe0ff','#ffb545','#ff4d5e'] }] });
    }

    function drawTable(filterRows){
      const table = document.getElementById('csvTable');
      table.innerHTML = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filterRows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</tbody>`;
    }
    drawTable(rows);
    document.getElementById('csvSearch').addEventListener('input', e=>{
      const q = e.target.value.toLowerCase();
      drawTable(rows.filter(r=>cols.some(c=>String(r[c]??'').toLowerCase().includes(q))));
    });
    toast(`CSV processado: ${filename} (${rows.length} registros)`, 'fa-file-csv');
  }

  // ---------- RELATÓRIOS ----------
  function deletedReports(){
    try{ return JSON.parse(localStorage.getItem('aio_deleted')||'[]'); }catch(e){ return []; }
  }
  function deleteReport(camp){
    const d = deletedReports();
    if(!d.includes(camp)) d.push(camp);
    localStorage.setItem('aio_deleted', JSON.stringify(d));
    toast('Relatório excluído: '+camp, 'fa-trash');
    go('relatorios');
  }
  function restoreReports(){
    localStorage.removeItem('aio_deleted');
    toast('Relatórios restaurados', 'fa-rotate-left');
    go('relatorios');
  }
  function exportReport(fmt, camp){
    const hydro = computeHydro();
    const eto = computeETo();
    const trees = computeTrees();
    const data = {
      projeto: AIO.project.name, municipio: AIO.project.municipio, uf: AIO.project.uf,
      area_km2: AIO.project.area_km2, altitude_m: AIO.project.altitude_m, bioma: AIO.project.bioma,
      campanha: camp, gerado_em: new Date().toISOString(),
      indicadores: { cobertura_vegetal_pct: AIO.kpi.cobertura_vegetal_pct, taxa_mortalidade_pct: AIO.kpi.taxa_mortalidade_pct, area_recuperada_pct: AIO.kpi.area_recuperada_pct },
      indices_espectrais: { campanhas: AIO.campaigns, ndvi: AIO.indices.ndvi, ndwi: AIO.indices.ndwi, moisture: AIO.indices.moisture, barren: AIO.indices.barren, fonte_ndvi: AIO._ndviIsReal?'Sentinel-2 real':'série-modelo' },
      tempo_real: weatherCache ? { temperatura_C: weatherCache.current.temperature_2m, umidade_pct: weatherCache.current.relative_humidity_2m, vento_kmh: weatherCache.current.wind_speed_10m, uv: weatherCache.daily.uv_index_max[0], precipitacao_24h_mm: weatherCache.daily.precipitation_sum[0] } : null,
      queimadas_inpe: AIO._fire ? { fonte: AIO._fire.source, focos: AIO._fire.count, risco: AIO._fire.risk } : null,
      hidrologia: hydro ? { vazao_m3s: hydro.Q, velocidade_m_s: hydro.V, area_molhada_m2: hydro.A, largura_m: hydro.largura, profundidade_m: hydro.profundidade, trecho_km: AIO.hydro.trecho_km, classe: hydro.cls, volume_24h_m3: hydro.volToday, chuva_hoje_mm: hydro.precipToday, pluviosidade_recente_mm: hydro.idx, bacia_km2: AIO.hydro.bacia_km2, rio: AIO.hydro.rio } : null,
      evapotranspiracao_mm_dia: eto ? eto.mmDay : null,
      arvores_estimadas: trees ? { area_km2: AIO.project.area_km2, arvores: trees.trees, raio_km: AIO.project.raio_delimitado_km, arvores_raio: trees.treesRadius, cobertura_ndvi_pct: +(trees.cov*100).toFixed(0) } : null
    };
    const ds = new Date().toISOString().slice(0,10);
    if(fmt==='CSV'){
      const csv = 'chave,valor\n' + Object.entries(flatten(data)).map(([k,v])=>`"${k}","${v??''}"`).join('\n');
      downloadBlob(csv, `relatorio_${camp}_${ds}.csv`, 'text/csv');
      toast('CSV exportado — '+camp, 'fa-file-csv');
    } else if(fmt==='JSON'){
      downloadBlob(JSON.stringify(data, null, 2), `relatorio_${camp}_${ds}.json`, 'application/json');
      toast('JSON exportado — '+camp, 'fa-file-code');
    } else if(fmt==='PDF'){
      openReportPrint(data);
      toast('Abrindo impressão — use "Salvar como PDF"', 'fa-file-pdf');
    }
  }
  function flatten(o, p=''){
    const out = {};
    Object.entries(o||{}).forEach(([k,v])=>{
      const key = p ? p+'.'+k : k;
      if(v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
      else out[key] = Array.isArray(v) ? v.join(';') : v;
    });
    return out;
  }
  function downloadBlob(content, name, type){
    const blob = new Blob([content], {type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  }
  function openReportPrint(data){
    const w = window.open('', '_blank');
    if(!w){ toast('Pop-up bloqueado', 'fa-triangle-exclamation'); return; }
    w.document.write(`<html><head><title>Relatório ${data.campanha}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:18px} table{width:100%;border-collapse:collapse;font-size:12px}
      td,th{border:1px solid #999;padding:5px 8px;text-align:left}
      th{background:#e8eef3} .sec{margin-top:16px;font-weight:bold}</style></head><body>
      <h1>AIO Observatory — Relatório ${data.campanha}</h1>
      <p>${data.projeto} · ${data.municipio}/${data.uf} · Área ${data.area_km2} km² · Gerado ${new Date(data.gerado_em).toLocaleString('pt-BR')}</p>
      <table>${Object.entries(flatten(data)).map(([k,v])=>`<tr><th>${k}</th><td>${v??''}</td></tr>`).join('')}</table>
      </body></html>`);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); }, 400);
  }

  // ---------- IA MODULE (interpretação sobre indicadores reais, auto-atualizável) ----------
  function runAI(){
    const panel = document.getElementById('iaPanel');
    if(!panel) return;
    panel.innerHTML = `<div class="ia-msg"><div class="ia-avatar"><i class="fa-solid fa-brain"></i></div><div class="ia-bubble">Processando série de indicadores reais...</div></div>`;
    setTimeout(()=>{
      const c = weatherCache;
      const h = computeHydro();
      const e = computeETo();
      const t = computeTrees();
      const fire = AIO._fire;
      const ndvi = AIO.indices.ndvi[AIO.indices.ndvi.length-1];
      const ndviTrend = AIO.indices.ndvi[AIO.indices.ndvi.length-1] - AIO.indices.ndvi[0];
      const msgs = [];
      msgs.push(`<b>Resumo técnico — ${new Date().toLocaleString('pt-BR')}:</b> análise automática sobre indicadores reais. NDVI atual ${ndvi.toFixed(2)} (${AIO._ndviIsReal?'Sentinel-2 real':'série-modelo'}), ${ndviTrend>=0?'trajetória de regeneração vegetal':'estabilidade'} desde a 1ª campanha.`);
      if(c) msgs.push(`<b>Condições atuais (Caraúbas-PB):</b> ${c.current.temperature_2m.toFixed(1)}°C · umidade ${c.current.relative_humidity_2m}% · vento ${c.current.wind_speed_10m.toFixed(1)} km/h · UV ${c.daily.uv_index_max[0].toFixed(1)} · precipitação 24h ${c.daily.precipitation_sum[0].toFixed(1)} mm.`);
      if(fire && fire.count != null) msgs.push(`<b>Focos de calor (INPE BDQueimadas):</b> ${fire.count} foco(s) ativo(s) num raio de ${AIO.fire.radius_km} km nas últimas 24-48h${fire.risk?`, com risco de fogo máximo de ${(fire.risk*100).toFixed(0)}%.`:''}`);
      else if(fire && fire.risk != null) msgs.push(`<b>Risco de queimada:</b> índice meteorológico computado em ${fire.risk}% (INPE indisponível no momento).`);
      if(h) msgs.push(`<b>Hidrologia da bacia:</b> vazão calculada de ${h.Q} m³/s (${h.cls}) via Q = A × V — ${h.A.toFixed(1)} m² × ${h.V} m/s — com pluviosidade real de ${h.idx.toFixed(1)} mm nos últimos 3 dias (${AIO.hydro.trecho}, ${AIO.hydro.trecho_km} km).`);
      if(e) msgs.push(`<b>Evapotranspiração:</b> ${e.mmDay} mm/dia nas últimas 24h — coerente com as temperaturas reais registradas na região.`);
      if(t) msgs.push(`<b>Vegetação:</b> estimativa de ${fmtInt(t.trees)} árvores na área de ${AIO.project.area_km2} km² (cobertura NDVI ${(t.cov*100).toFixed(0)}%) e ${fmtInt(t.treesRadius)} no raio delimitado de ${AIO.project.raio_delimitado_km} km.`);
      const seco = h && h.Q < 1;
      const comFoco = fire && fire.count > 0;
      msgs.push(`<b>Recomendações técnicas:</b> ${seco?'risco de seca — reforçar irrigação de apoio no Setor B.':'regime hídrico normal — manter manejo programado.'} ${comFoco?'Há focos de calor ativos no entorno — acionar brigada e vistoria preventiva nos talhões.':'Sem focos ativos — manter monitoramento passivo.'} ${AIO.kpi.taxa_mortalidade_pct<15?`Taxa de mortalidade das mudas em ${AIO.kpi.taxa_mortalidade_pct}% (abaixo do limite de 15%).`:''}`);
      panel.innerHTML = msgs.map(m=>`<div class="ia-msg"><div class="ia-avatar"><i class="fa-solid fa-brain"></i></div><div class="ia-bubble">${m}</div></div>`).join('');
    }, 500);
  }

  // ---------- THEME ----------
  function toggleTheme(){
    const html = document.documentElement;
    const cur = html.getAttribute('data-theme');
    html.setAttribute('data-theme', cur==='light'?'dark':'light');
    toast('Tema alternado', 'fa-circle-half-stroke');
  }

  // ---------- INIT ----------
  function init(){
    tickClock(); setInterval(tickClock,1000);
    document.getElementById('burgerBtn').addEventListener('click', ()=>document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('alertBtn').addEventListener('click', ()=>{ go('dashboard'); });
    document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click', ()=>go(a.dataset.page)));
    document.addEventListener('click', e=>{ if(e.target.id==='refreshWeather'){ weatherCache=null; toast('Sincronizando com Open-Meteo...', 'fa-rotate'); fetchWeather().then(()=>{renderMeteorologia(); toast('Meteorologia atualizada','fa-check');}); } });
    fetchWeather().then(()=>{ updateFireCard(); }).catch(()=>{});
    fetchHydroPrecip().then(()=>{ if(document.getElementById('page-dashboard')) updateHydroCard(); }).catch(()=>{});
    go('dashboard');
    loadRealNDVITrend().then(()=>{
      if(AIO._ndviIsReal && document.getElementById('page-dashboard')) renderDashboard();
      if(AIO._ndviIsReal && document.getElementById('page-vegetacao')) renderVegetacao();
    });

    // Atualização automática contínua (tempo real)
    setInterval(()=>{ weatherCache=null; fetchWeather().then(()=>{
      if(document.getElementById('page-dashboard')) renderDashboard();
      if(document.getElementById('page-meteorologia')) renderMeteorologia();
    }).catch(()=>{}); }, 10*60*1000);
    setInterval(()=>{ updateFireCard(); }, 10*60*1000);
    setInterval(()=>{ fetchHydroPrecip().then(()=>{ if(document.getElementById('page-dashboard')) updateHydroCard(); }).catch(()=>{}); }, 10*60*1000);
    setInterval(()=>{ if(document.getElementById('page-ia')) runAI(); }, 3*60*1000);
  }

  return { go, toast, runAI, boot, deleteReport, restoreReports, exportReport, deletedReports,
    debug:{ fetchWeather, fetchOficial, fetchHydroPrecip, updateFireCard, updateHydroCard, updateEToCard, updateTreesCard, applyOficial } };
})();

window.addEventListener('load', () => AIOApp.boot());
