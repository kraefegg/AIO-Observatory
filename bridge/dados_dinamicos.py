# ============ AIO OBSERVATORY — BASE DE CÁLCULOS DINÂMICOS ============
# Gera telemetry/weather-oficial.json com dados de FONTES OFICIAIS:
#   · INMET — estação automática mais próxima (apiprevmet3.inmet.gov.br)
#   · INMET — previsão oficial 15 dias para Caraúbas-PB (geocode 2504074)
#   · Open-Meteo — precipitação real (série passada) p/ hidrologia Q = A × V
# Computa modelos derivados: ETo (Hargreaves–Samani), vazão, estimativa de
# árvores e risco de queimada. Saída consumida pelo app via fetch, com
# degradação graciosa (mesmo padrão de telemetry/station-latest.json).
#
# Uso (stdlib puro, sem dependências):
#   python bridge/dados_dinamicos.py            # grava telemetry/weather-oficial.json
#   python bridge/dados_dinamicos.py --print    # imprime o JSON sem gravar
#
# Para atualização periódica: agendar no Windows (Agendador) ou GitHub Action.

import argparse
import json
import math
import os
import urllib.request
from datetime import datetime, timedelta

# ---------------------------------------------------------------- config
GEOCODE = "2504074"                     # Caraúbas-PB (IBGE)
LAT, LON = -7.7283, -36.4935            # sítio PRAD (mesmo de AIO.project)
AREA_KM2 = 5.73                         # área do PRAD (km²)
RAIO_KM = 3.0                           # raio de análise do entorno
ALT_M = 455                             # altitude média (m)

BASE_PREV = "https://apiprevmet3.inmet.gov.br/previsao"
BASE_EST = "https://apiprevmet3.inmet.gov.br/estacao/proxima"
OPENMETEO = "https://api.open-meteo.com/v1/forecast"

# Modelo hidrológico — mesma tabela de AIO.hydro.vel_por_chuva (data.js)
VEL_POR_CHUVA = [
    (0, 0.10, "Seca / estiagem"),
    (1, 0.30, "Chuva fraca recente"),
    (5, 0.50, "Chuva moderada"),
    (20, 0.80, "Chuva forte recente"),
    (50, 1.20, "Enxurrada / cheia"),
]
AREA_MOLHADA = 7.2                      # A = 3,8 m × 1,9 m (m²)

# Modelo vegetação — mesma densidade de AIO.trees (data.js)
DENSIDADE_HA = 1800                     # Caatinga arbustivo-arbórea do Cariri
DENSIDADE_RAIO_HA = 1200
NDVI_FALLBACK = 0.42                    # último NDVI modelo (se export falhar)


def get_json(url, timeout=30):
    req = urllib.request.Request(
        url, headers={"User-Agent": "AIO-Observatory/1.0", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


# ------------------------------------------------- INMET · estação próxima
def inmet_estacao():
    """Estação automática mais próxima com medições em tempo real."""
    try:
        data = get_json(f"{BASE_EST}/{GEOCODE}")
    except Exception:
        return None
    est = data.get("estacao") or {}
    d = data.get("dados") or {}
    if not est or not d:
        return None
    vel_ms = float(d.get("VEN_VEL") or 0)
    raj_ms = float(d.get("VEN_RAJ") or 0)
    return {
        "codigo": est.get("CODIGO"),
        "nome": est.get("NOME"),
        "uf": est.get("UF"),
        "distancia_km": est.get("DISTANCIA_EM_KM"),
        "lat": est.get("LATITUDE"),
        "lon": est.get("LONGITUDE"),
        "medicao": f"{d.get('DT_MEDICAO')} {d.get('HR_MEDICAO')}",
        "atual": {
            "temperatura_c": float(d.get("TEM_INS") or 0),
            "sensacao_c": float(d.get("TEM_SEN") or 0),
            "umidade_pct": float(d.get("UMD_INS") or 0),
            "pressao_hpa": float(d.get("PRE_INS") or 0),
            "vento_kmh": round(vel_ms * 3.6, 1),
            "rajada_kmh": round(raj_ms * 3.6, 1),
            "vento_dir_deg": float(d.get("VEN_DIR") or 0),
            "chuva_mm": float(d.get("CHUVA") or 0),
            "radiacao_kjm2": float(d.get("RAD_GLO") or 0),
            "temp_max_c": float(d.get("TEM_MAX") or 0),
            "temp_min_c": float(d.get("TEM_MIN") or 0),
        },
    }


# --------------------------------------------- INMET · previsão oficial 15d
def inmet_previsao():
    """Previsão oficial INMET para o geocode de Caraúbas-PB."""
    try:
        data = get_json(f"{BASE_PREV}/{GEOCODE}")
    except Exception:
        return None
    dias = data.get(GEOCODE) or {}
    out = []
    for dia, fases in sorted(dias.items()):
        if not isinstance(fases, dict):
            continue
        manha = fases.get("manha") or {}
        tarde = fases.get("tarde") or {}
        noite = fases.get("noite") or {}
        out.append({
            "data": dia,
            "manha": {"resumo": manha.get("resumo"), "temp_max": manha.get("temp_max"),
                       "temp_min": manha.get("temp_min"), "vento": manha.get("int_vento"),
                       "dir_vento": manha.get("dir_vento"), "icone": manha.get("cod_icone")},
            "tarde": {"resumo": tarde.get("resumo"), "temp_max": tarde.get("temp_max"),
                       "temp_min": tarde.get("temp_min"), "vento": tarde.get("int_vento"),
                       "dir_vento": tarde.get("dir_vento"), "icone": tarde.get("cod_icone")},
            "noite": {"resumo": noite.get("resumo"), "temp_max": noite.get("temp_max"),
                       "temp_min": noite.get("temp_min"), "vento": noite.get("int_vento"),
                       "dir_vento": noite.get("dir_vento"), "icone": noite.get("cod_icone")},
        })
    return out if out else None


# --------------------------------- Open-Meteo · precipitação real (7 dias)
def openmeteo_precip():
    """Série real de precipitação (mm) dos últimos 7 dias para o sítio."""
    url = (f"{OPENMETEO}?latitude={LAT}&longitude={LON}"
           f"&daily=precipitation_sum,uv_index_max,temperature_2m_max,temperature_2m_min"
           f"&past_days=7&forecast_days=1&timezone=auto")
    try:
        d = get_json(url)
    except Exception:
        return None
    daily = d.get("daily") or {}
    return {
        "time": daily.get("time") or [],
        "precip_sum": daily.get("precipitation_sum") or [],
        "uv_max": (daily.get("uv_index_max") or [0])[0] if daily.get("uv_index_max") else 0,
        "temp_max": (daily.get("temperature_2m_max") or [0])[0] if daily.get("temperature_2m_max") else 0,
        "temp_min": (daily.get("temperature_2m_min") or [0])[0] if daily.get("temperature_2m_min") else 0,
    }


# ------------------------------------------------------- modelos derivados
def vel_from_rain(mm):
    """Interpolação linear sobre as faixas reais do trecho (0,10 → 1,20 m/s)."""
    if mm <= VEL_POR_CHUVA[0][0]:
        return VEL_POR_CHUVA[0][1]
    for i in range(1, len(VEL_POR_CHUVA)):
        a, b = VEL_POR_CHUVA[i - 1], VEL_POR_CHUVA[i]
        if mm <= b[0]:
            den = b[0] - a[0] or 1
            return a[1] + (b[1] - a[1]) * ((mm - a[0]) / den)
    return VEL_POR_CHUVA[-1][1]


def hidrologia(precip):
    """Q = A × V. Pluviosidade acumulada = 0,5 hoje + 0,3 ontem + 0,2 anteontem."""
    if not precip or len(precip.get("precip_sum", [])) < 3:
        return None
    P = precip["precip_sum"]
    idx = 0.5 * (P[-1] or 0) + 0.3 * (P[-2] or 0) + 0.2 * (P[-3] or 0)
    v = round(vel_from_rain(idx), 3)
    q = round(AREA_MOLHADA * v, 2)
    if q < 1:
        cls = "SECA"
    elif q < 2.5:
        cls = "CAUDAL BAIXO"
    elif q < 5:
        cls = "REGIME NORMAL"
    elif q < 8:
        cls = "CAUDAL ALTO"
    else:
        cls = "EXTRAORDINÁRIO"
    rotulo = next((r for c, _, r in reversed(VEL_POR_CHUVA) if idx >= c), VEL_POR_CHUVA[0][2])
    return {
        "q_m3s": q, "v_ms": v, "area_m2": AREA_MOLHADA,
        "precip_recente_mm": round(idx, 1), "precip_hoje_mm": P[-1] or 0,
        "classe": cls, "rotulo": rotulo,
        "vol_diario_m3": int(q * 86400),
    }


def eto_hargreaves(temp_max, temp_min, latitude, dia_ano, altitude=455):
    """ETo (mm/dia) por Hargreaves–Samani: 0,0023·Ra·(Tm+17,8)·√ΔT."""
    if not temp_max or not temp_min:
        return None
    tm = (temp_max + temp_min) / 2
    gsc = 0.0820
    phi = math.radians(latitude)
    dr = 1 + 0.033 * math.cos(2 * math.pi / 365 * dia_ano)
    delta = 0.409 * math.sin(2 * math.pi / 365 * dia_ano - 1.39)
    ws = math.acos(max(-1, min(1, -math.tan(phi) * math.tan(delta))))
    ra = (24 * 60 / math.pi) * gsc * dr * (
        ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws)
    )
    eto = 0.0023 * ra * (tm + 17.8) * math.sqrt(max(0, temp_max - temp_min))
    return round(eto, 2)


def estimativa_arvores(ndvi):
    """Densidade Caatinga × cobertura real (NDVI) — mesmo modelo de app.js."""
    cov = max(0.15, min(1.0, (ndvi - 0.1) / 0.5))
    ha = AREA_KM2 * 100
    total = int(ha * DENSIDADE_HA * cov)
    raio_ha = math.pi * RAIO_KM * RAIO_KM * 100
    total_raio = int(raio_ha * DENSIDADE_RAIO_HA * cov)
    return {
        "ndvi": round(ndvi, 3),
        "cobertura_pct": round(cov * 100, 1),
        "arvores": total,
        "arvores_no_raio": total_raio,
        "area_ha": int(ha),
        "raio_km": RAIO_KM,
    }


def risco_fogo(estacao, precip):
    """Risco meteorológico de queimada (0–100) — mesma lógica do fallback do app."""
    if not estacao:
        return None
    a = estacao["atual"]
    s = 0
    t, u, v = a["temperatura_c"], a["umidade_pct"], a["vento_kmh"]
    s += 25 if t > 32 else (15 if t > 28 else 5)
    s += 25 if u < 30 else (15 if u < 45 else 5)
    s += 15 if v > 25 else (8 if v > 15 else 3)
    dias = 0
    if precip and precip.get("precip_sum"):
        for p in precip["precip_sum"]:
            if (p or 0) < 0.5:
                dias += 1
            else:
                break
    s += min(dias * 3, 25)
    if precip and (precip["precip_sum"][-1] or 0) < 0.5:
        s += 10
    return {"risco_pct": min(100, s), "dias_sem_chuva": dias}


def build():
    estacao = inmet_estacao()
    previsao = inmet_previsao()
    precip = openmeteo_precip()

    hidro = hidrologia(precip)
    est = estacao["atual"] if estacao else None
    if est and est["temp_max_c"] and est["temp_min_c"]:
        eto = eto_hargreaves(est["temp_max_c"], est["temp_min_c"], LAT,
                             datetime.now().timetuple().tm_yday, ALT_M)
    else:
        eto = None
    arvores = estimativa_arvores(NDVI_FALLBACK)
    fogo = risco_fogo(estacao, precip)

    # Fontes usadas (registro de proveniência de cada bloco)
    fontes = []
    if estacao:
        fontes.append(f"INMET estação {estacao['codigo']} ({estacao['nome']}, {estacao['distancia_km']} km)")
    if previsao:
        fontes.append("INMET previsão oficial 15 dias")
    if precip:
        fontes.append("Open-Meteo precipitação real 7 dias")

    return {
        "schema": "AIO.weather.oficial/v1",
        "site": "car01",
        "geocode": GEOCODE,
        "ts": datetime.now(timezone_utc()).isoformat(timespec="seconds"),
        "fonte": " · ".join(fontes) if fontes else "modelo (sem conexão)",
        "estacao": estacao,
        "previsao15d": previsao,
        "openmeteo": precip,
        "calculos": {
            "eto_mm_dia": eto,
            "eto_metodo": "Hargreaves–Samani (Tmax/Tmin INMET + Ra astronômica)" if eto else None,
            "hidrologia": hidro,
            "hidrologia_metodo": "Q = A × V · A = 7,2 m² · V por pluviosidade real 3 dias",
            "arvores": arvores,
            "risco_fogo": fogo,
        },
    }


def timezone_utc():
    from datetime import timezone
    return timezone.utc


def main():
    ap = argparse.ArgumentParser(description="AIO Observatory — dados dinâmicos de fontes oficiais")
    ap.add_argument("--print", action="store_true", help="imprime JSON na saída sem gravar")
    args = ap.parse_args()

    out = build()
    if args.print:
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = os.path.join(root, "telemetry", "weather-oficial.json")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    os.replace(tmp, target)
    print(f"[ok] {target} — {out['fonte']}")
    c = out.get("calculos") or {}
    h = c.get("hidrologia") or {}
    print(f"  ETo={c.get('eto_mm_dia')} mm/dia · Q={h.get('q_m3s')} m³/s ({h.get('classe')}) "
          f"· árvores={c.get('arvores', {}).get('arvores')} · risco_fogo={c.get('risco_fogo', {}).get('risco_pct')}%")


if __name__ == "__main__":
    main()
