#!/usr/bin/env bash
# ============ KRAEFEGG ON CLOUD — setup one-shot da VM kraefegg-opencode ============
# Roda como o usuário kraefegg na instância Always Free (Ubuntu 24.04):
#   tmux, git, Node.js LTS, opencode e o repo AIO-Observatory clonado.
#
# Uso (na VM):
#   chmod +x vm-setup.sh && ./vm-setup.sh

set -euo pipefail

echo "==> [1/5] pacotes base"
sudo apt-get update -qq
sudo apt-get install -y -qq tmux git curl ca-certificates build-essential

echo "==> [2/5] Node.js LTS (NodeSource)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node --version
npm --version

echo "==> [3/5] opencode (CLI global)"
if ! command -v opencode >/dev/null 2>&1; then
  sudo npm install -g opencode-ai
fi
opencode --version

echo "==> [4/5] repo AIO-Observatory"
if [ ! -d "$HOME/AIO-Observatory" ]; then
  git clone https://github.com/kraefegg/AIO-Observatory "$HOME/AIO-Observatory"
fi

echo "==> [5/5] primeiro acesso"
cat <<'EOF'

Setup concluído. Para iniciar a sessão na nuvem:
  cd ~/AIO-Observatory
  tmux new -s aio
  opencode
  /connect          # autentica o provedor de LLM

Dica: dentro do tmux, saia com Ctrl+b, d e reconecte com: tmux attach -t aio
EOF
