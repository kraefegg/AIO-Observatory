# ============ AIO OBSERVATORY — KIT ESTAÇÃO METEOROLÓGICA AGRO-AMBIENTAL ============
# Firmware MicroPython para ESP32-S3 (PoC M1).
# Contrato de telemetria: ver docs/telemetry-contract.md (página Meteorologia do dashboard).
#
# Fluxo: sensor -> edge (ESP32-S3) -> MQTT -> ponte -> telemetry/station-latest.json -> AIO (fetch).
# Modo normal: deep sleep entre ciclos; ao acordar, coleta, publica e volta a dormir.
# Copie config.py.example para config.py e preencha as credenciais (nunca versionar).

import json
import machine
import network
import time
from config import (WIFI_SSID, WIFI_PASS, MQTT_BROKER, MQTT_PORT,
                    MQTT_USER, MQTT_PASS, MQTT_TOPIC, SITE_ID,
                    SLEEP_S, I2C_SCL, I2C_SDA)

# ---------- SENSORES (I2C) ----------
i2c = machine.I2C(0, scl=machine.Pin(I2C_SCL), sda=machine.Pin(I2C_SDA), freq=100000)


def read_sht31():
    """Temperatura (°C) e umidade (%) via SHT31 (endereço 0x44)."""
    try:
        i2c.writeto(0x44, b'\x2C\x06')
        time.sleep_ms(100)
        raw = i2c.readfrom(0x44, 6)
        t = -45 + 175 * ((raw[0] << 8 | raw[1]) / 65535.0)
        h = 100 * ((raw[3] << 8 | raw[4]) / 65535.0)
        return t, max(0, min(100, h))
    except Exception:
        return None, None


def read_bmp280():
    """Pressão atmosférica (hPa) via BMP280 (endereço 0x76)."""
    try:
        i2c.writeto(0x76, b'\xD0', True)
        if i2c.readfrom(0x76, 1)[0] != 0x58:
            return None
        i2c.writeto(0x76, bytes([0xF4, 0x55]), True)   # normal mode, T=OSR1, P=OSR1
        time.sleep_ms(10)
        data = bytearray()
        for reg in range(0xF7, 0xF7 + 6):
            i2c.writeto(0x76, bytes([reg]), True)
            data += i2c.readfrom(0x76, 1)
        press_raw = (data[0] << 12) | (data[1] << 4) | (data[2] >> 4)
        return press_raw / 256.0 / 100.0  # Pa -> hPa (sem calibração completa; PoC)
    except Exception:
        return None


# ---------- CONTADORES (vento / chuva) ----------
wind_count = 0
rain_count = 0


def _on_wind(pin):  # anemômetro de cana (reed switch): 1 pulso = 1 volta
    global wind_count
    wind_count += 1


def _on_rain(pin):  # pluviômetro de báscula: 1 pulso = 0.2 mm
    global rain_count
    rain_count += 1


wind_pin = machine.Pin(26, machine.Pin.IN, machine.Pin.PULL_UP)
rain_pin = machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP)
wind_pin.irq(trigger=machine.Pin.IRQ_FALLING, handler=_on_wind)
rain_pin.irq(trigger=machine.Pin.IRQ_FALLING, handler=_on_rain)


def read_wind():
    """Velocidade (km/h) e rajada estimadas por pulsos no ciclo + direção (ADC)."""
    anemo = machine.ADC(machine.Pin(34))
    anemo.atten(machine.ADC.ATTN_11DB)
    vane = machine.ADC(machine.Pin(35))
    vane.atten(machine.ADC.ATTN_11DB)
    speed = wind_count * 2.4        # fator de campo (calibrar no site)
    gust = max(anemo.read_u16() / 65535.0 * 30.0, speed)
    mv = vane.read_u16() / 65535.0 * 3300.0
    dirs = [0, 45, 90, 135, 180, 225, 270, 315, 0]
    refs = [3300, 3000, 2700, 2400, 2100, 1800, 1500, 1200, 1000]  # mV por divisor
    deg = min(dirs, key=lambda d: abs(refs[dirs.index(d)] - mv))
    return round(speed, 1), round(gust, 1), deg


def read_battery():
    """Tensão da bateria LiPo via divisor resistivo (ADC)."""
    adc = machine.ADC(machine.Pin(36))
    adc.atten(machine.ADC.ATTN_11DB)
    v = adc.read_u16() / 65535.0 * 3.3 * 2.0     # fator 2 do divisor
    return round(v, 2)


# ---------- MQTT ----------
def mqtt_connect():
    from umqtt.simple import MQTTClient
    c = MQTTClient('car01_' + str(int(time.time())), MQTT_BROKER,
                   port=MQTT_PORT, user=MQTT_USER, password=MQTT_PASS, keepalive=60)
    c.connect()
    return c


def publish_payload():
    t, h = read_sht31()
    p = read_bmp280()
    ws, wg, wd = read_wind()
    bv = read_battery()
    payload = {
        "site": SITE_ID,
        "ts": "%04d-%02d-%02dT%02d:%02d:%02dZ" % time.gmtime()[:6],
        "metrics": {
            "temperature_c": t if t is not None else 0.0,
            "humidity_pct": h if h is not None else 0.0,
            "pressure_hpa": p if p is not None else 0.0,
            "wind_speed_kmh": ws,
            "wind_gust_kmh": wg,
            "wind_dir_deg": wd,
            "rain_24h_mm": round(rain_count * 0.2, 1),
            "solar_mj_m2": round(0.0, 1)   # piranômetro opcional (P1)
        },
        "battery_v": bv,
        "rssi_dbm": None
    }
    return payload


def main():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASS)
    for _ in range(30):
        if wlan.isconnected():
            break
        time.sleep(1)
    if not wlan.isconnected():
        return                          # sem rede: dorme e tenta de novo no próximo ciclo
    payload = publish_payload()
    try:
        c = mqtt_connect()
        c.publish(MQTT_TOPIC, json.dumps(payload))
        c.disconnect()
    except Exception:
        try:
            with open('/station_latest.json', 'w') as f:   # fallback local
                f.write(json.dumps(payload))
        except Exception:
            pass
    machine.deepsleep(SLEEP_S * 1000)


if __name__ == '__main__':
    main()
