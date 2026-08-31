#!/bin/bash
# ============ KRAEFEGG ON CLOUD — VM de trabalho para opencode (Azure) ============
# Cloud-init executado automaticamente na criação da VM (Ubuntu 24.04 LTS).
# Instala Node.js 20 LTS, git, tmux, opencode e clona o repo kraefegg/AIO-Observatory.
# Uso: az vm create ... --custom-data cloud/azure-vm-opencode-cloud-init.sh
set -e

export DEBIAN_FRONTEND=noninteractive

echo "==> Atualizando o sistema"
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Instalando dependências (git, curl, tmux, build tools)"
apt-get install -y -qq git curl ca-certificates build-essential tmux python3 python3-pip jq

echo "==> Instalando Node.js 20 LTS (nodesource)"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

echo "==> Instalando opencode (global)"
npm install -g opencode-ai

echo "==> Clonando o projeto Kraefegg/AIO"
USER_HOME=$(getent passwd "$(logname 2>/dev/null || echo ubuntu)" | cut -d: -f6 2>/dev/null || echo /home/ubuntu)
mkdir -p "$USER_HOME"
chown "$(logname 2>/dev/null || echo ubuntu)" "$USER_HOME"
sudo -u "$(logname 2>/dev/null || echo ubuntu)" git clone https://github.com/kraefegg/AIO-Observatory.git "$USER_HOME/AIO-Observatory" 2>/dev/null || echo "AIO-Observatory já existe ou falhou o clone (rede) — pode clonar depois."

echo "==> Resumo"
echo "  opencode:  $(command -v opencode || echo 'via npm -g install opencode-ai')"
node -v
echo "==> Concluído. Entre via SSH e rode:"
echo "    cd ~/AIO-Observatory && opencode"
