# ============ AIO OBSERVATORY — PONTE MQTT → JSON (PoC M1) ============
# Assina o tópico do kit (firmware/station_weather.py), valida o contrato
# (docs/telemetry-contract.md) e publica o último payload em telemetry/station-latest.json,
# que o AIO consome via fetch. Rode em máquina/VM de baixo custo ou como GitHub Action.
#
# Uso:
#   pip install paho-mqtt
#   $env:MQTT_BROKER="..." ; $env:MQTT_USER="..." ; $env:MQTT_PASS="..."
#   python bridge/mqtt_to_json.py
#
# Credenciais SOMENTE via variáveis de ambiente (nunca versionar).

import json
import os
import sys
import time

import paho.mqtt.client as mqtt

BROKER = os.environ.get("MQTT_BROKER", "localhost")
PORT = int(os.environ.get("MQTT_PORT", "1883"))
USER = os.environ.get("MQTT_USER", "")
PASS = os.environ.get("MQTT_PASS", "")
TOPICS = [t.strip() for t in os.environ.get("MQTT_TOPICS", "aio/telemetry/+").split(",")]
OUT = os.environ.get("TEL_OUT", "telemetry/station-latest.json")

REQUIRED = ("site", "ts", "metrics")
REQUIRED_METRICS = ("temperature_c", "humidity_pct", "pressure_hpa", "wind_speed_kmh")


def valid_payload(p):
    if not isinstance(p, dict):
        return False
    if not all(k in p for k in REQUIRED):
        return False
    m = p.get("metrics") or {}
    return all(k in m for k in REQUIRED_METRICS)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except Exception:
        return
    if not valid_payload(payload):
        print("[skip] payload inválido:", msg.topic)
        return
    payload.setdefault("rssi_dbm", None)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)                     # gravação atômica
    print("[ok]", payload.get("site"), payload.get("ts"))


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="aio_bridge")
    if USER:
        client.username_pw_set(USER, PASS)
    client.on_message = on_message
    client.connect(BROKER, PORT, keepalive=60)
    for t in TOPICS:
        client.subscribe(t)
        print("assinando:", t)
    client.loop_forever()


if __name__ == "__main__":
    main()
