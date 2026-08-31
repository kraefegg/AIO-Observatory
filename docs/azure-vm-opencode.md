# Kraefegg on Cloud — VM Azure para opencode

Status: **proposta** (aguardando provisionamento) · Criador: `railsonarrd@outlook.com` · Azure CLI 2.89.0.

## Objetivo
Rodar o opencode (agente de codificação) numa VM Ubuntu 24.04 do Azure, com o repo
`kraefegg/AIO-Observatory` clonado, para trabalho contínuo em nuvem (24/7, sem depender
do PC local). É o complemento da integração OCI (`docs/oracle-cloud-connection.md`).

## Por que VM (e não banco de dados)
O opencode é um CLI que exige um sistema operacional/shell. Azure Database (PaaS) não roda
programas arbitrários. Se no futuro precisar de histórico de telemetria, adiciona-se um
Azure Database (PostgreSQL/TimescaleDB) **separado** — não substitui a VM.

## Provisionamento (rodar com `az` logado)
```powershell
az group create --name rg-kraefegg --location brazilsouth
az vm create `
  --resource-group rg-kraefegg `
  --name kraefegg-vm `
  --image Ubuntu2404 `
  --size Standard_B1s `
  --location brazilsouth `
  --admin-username kraefegg `
  --generate-ssh-keys `
  --custom-data cloud/azure-vm-opencode-cloud-init.sh `
  --public-ip-sku Standard
```
- `Standard_B1s` cobre o Azure free tier (750 h/mês por 12 meses) — suficiente para opencode.
- O `--custom-data` (cloud-init) instala Node 20, git, tmux, opencode e clona o repo.
- Acesso: `ssh kraefegg@<IP_PÚBLICO>` ou Azure Bastion (recomendado, sem expor porta 22).

## Primeiro acesso
```bash
cd ~/AIO-Observatory
opencode            # abre a TUI
/connect            # autentica com o provedor de LLM (opencode.ai/auth ou API key própria)
```
Dica: rodar dentro de `tmux` para o agente continuar após fechar a sessão SSH.

## Custo (aproximado, free tier)
- `Standard_B1s`: ~750 h/mês grátis (12 meses). Depois: ~US$ 8–9/mês.
- IP público Standard: grátis enquanto associado à VM em execução.

## Nota sobre a conta
A assinatura aparece como `N/A (tenant level account)`. Se o `az vm create` falhar por
`billing`/`quota`, é preciso uma assinatura real (free trial ou Azure for Students) ativa
para o tenant. Verificar com `az account list --output table`.

## Próximos passos
- [ ] Provisionar a VM (`az vm create` acima) e validar `opencode --version` no SSH
- [ ] Autenticar o opencode (`/connect`) e rodar `opencode` dentro de `~/AIO-Observatory`
- [ ] (Opcional) subir a ponte MQTT→OCI na mesma VM como `systemd` (`bridge/mqtt_to_json.py`)
