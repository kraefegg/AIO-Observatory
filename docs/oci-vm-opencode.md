# Kraefegg on Cloud — VM Always Free OCI para opencode

Status: **rede provisionada; aguardando capacidade A1.Flex (automatizado 1h/1h); setup da VM pronto** (10/08/2026) ·
Tenancy `Kraefegg (root)` · `sa-saopaulo-1`.

## Objetivo
Rodar o opencode (agente de codificação) numa instância **Always Free** do OCI, com o repo
`kraefegg/AIO-Observatory` clonado, para trabalho contínuo em nuvem — custo zero.
Complementa a integração OCI de telemetria (`docs/oracle-cloud-connection.md`).

## Por que OCI e não Azure
A conta Azure (`railsonarrd@outlook.com`) está logada mas sem assinatura utilizável
(`SubscriptionNotFound`, "tenant level account"). O OCI já está verificado e o Free Tier
inclui VM **Always Free**: Ampere A1 (até 4 OCPU / 24 GB) + 200 GB de volume. Alternativa
Azure (caso ative uma assinatura grátis): ver `docs/azure-vm-opencode.md`.

## Status da autenticação OCI (nativo, 10/08/2026 — RESOLVIDO)
- A **API nativa** (SDK Python `oci`) agora autentica com a chave de assinatura RSA
  (fingerprint `a5:cb:df:ac:71:1b:ff:12:a2:a2:2e:b2:12:1f:7b:8a`), registrada em
  Console → Profile → API Keys. O 401 `IdcsConversionError` era atraso de propagação IDCS
  (~5–15 min) após cadastrar a chave — bastou aguardar e repetir.
- Antes disso, só o **Swift API** (user+token) funcionava; a API nativa retornava 401
  universal porque a chave ainda não existia. S3-compatível continua inutilizável com o
  usuário federado (`oracleidentitycloudservice/` quebra SigV4) — **usar sempre Swift**.

## Arquitetura provisionada (`cloud/oci_provision.py`) — rede JÁ CRIADA
- VCN `10.0.0.0/16` + Internet Gateway + Route Table (`0.0.0.0/0 → IGW`)
- Security List: ingress **22/tcp** (SSH) e **4096/tcp** (web do opencode); egress tudo
- Subnet pública `10.0.0.0/24` (AD-1; região tem só 1 AD)
- Instância `kraefegg-opencode`: **VM.Standard.A1.Flex** · 2 OCPU / 12 GB RAM (Always Free) ·
  Ubuntu 24.04 · boot 50 GB — **PENDENTE**: `Out of host capacity` (Free Tier saturado)

## Chaves (fora do repo, nunca versionar)
| Recurso | Caminho |
|---|---|
| API key (assinatura) | `~/.oci/api_key.pem` (privada) — fingerprint `a5:cb:...` |
| API key pública | `~/.oci/api_key_public.pem` → já cadastrada no Console |
| Fingerprint | gravado em `~/.oci/oci_auth.env` (`OCI_FINGERPRINT=a5:cb:df:ac:71:1b:ff:12:a2:a2:2e:b2:12:1f:7b:8a`) |
| SSH da VM | `~/.ssh/kraefegg-vm` / `.pub` |

## Provisionar / tentar novamente
```powershell
python cloud/oci_provision.py
```
- **Idempotente**: reusa VCN/IGW/RT/SL/subnet já criados (não duplica) e lança a instância.
- Tenta os ADs com A1.Flex e tamanhos `2/12 → 1/6 → 4/24`; aguarda 60s entre tentativas.
- **Capacidade**: se falhar com `Out of host capacity`, reexecute em outro horário (menos
  movimentado, ex.: madrugada). O Free Tier libera slots periodicamente. Não criar por
  Console agora: usa a mesma capacidade — o script já faz o trabalho.
- **Automação**: tarefa do Agendador do Windows `Kraefegg-OCIVM` roda o script a cada **1h**
  (se necessário, ajuste a frequência ou cancele com `Unregister-ScheduledTask`). O script
  encerra sozinho ao detectar a instância e loga tudo em `~/.oci/oci_provision.log`.

## Primeiro acesso (quando a instância subir)
```bash
ssh -i ~/.ssh/kraefegg-vm kraefegg@<IP_PÚBLICO>
# setup one-shot (tmux, Node, opencode, repo) — arquivo no repo local:
scp -i ~/.ssh/kraefegg-vm cloud/vm-setup.sh kraefegg@<IP_PÚBLICO>:~/
ssh -i ~/.ssh/kraefegg-vm kraefegg@<IP_PÚBLICO> './vm-setup.sh'
```
Em seguida (já dentro da VM, conforme o script sugere):
```bash
cd ~/AIO-Observatory
tmux new -s aio
opencode
/connect              # autentica o provedor de LLM
```
Dica: rodar dentro de `tmux` para o agente continuar após fechar o SSH (sair: Ctrl+b, d).
