# Conexão Oracle Cloud (OCI) — AIO Observatory

Status: **verificada e funcionando** (10/08/2026) · Free Tier · Região São Paulo.

## Parâmetros (públicos, sem segredos)
| Item | Valor |
|---|---|
| Tenancy | `Kraefegg (root)` |
| Namespace | `gryamzqw4zsj` |
| Região | `sa-saopaulo-1` (home region `GRU`) |
| Compartimento designado S3/Swift | `Kraefegg (root)` |
| Endpoint Swift API | `https://swiftobjectstorage.sa-saopaulo-1.oraclecloud.com/v1/gryamzqw4zsj` |
| Endpoint S3-compatível | `https://gryamzqw4zsj.compat.objectstorage.sa-saopaulo-1.oraclecloud.com` |
| Tenancy OCID | `ocid1.tenancy.oc1..aaaaaaaabqjdad4d2jptjynsgjr4hnrfwlrweo72ea5li6n63cbh2b2qfzwq` |
| User OCID | `ocid1.user.oc1..aaaaaaaajifr66mjzrgzsgz3bmb57gn2rgck7llcimfsczwrvs6ovrpwv7wq` |

## Credenciais
- **Usuário**: `railsonarrd@gmail.com`
- **Auth token**: guardado em `~/.oci/oci_auth.env` (fora do repo, nunca versionar).
- Autenticação testada via **Swift API** (HTTP Basic user+token) → HTTP 200.
- **S3-compatível NÃO funciona** com este usuário federado (IDCS): o nome contém `oracleidentitycloudservice/`, e a `/` quebra a assinatura SigV4 (`AuthorizationHeaderMalformed`). **Usar sempre Swift.**

## Testes rápidos
```powershell
# Carregar credenciais do arquivo local (nunca versionar) e testar a conta
Get-Content "$HOME\.oci\oci_auth.env" | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { Set-Item -Path ("Env:" + $matches[1]) -Value $matches[2] } }
curl.exe -s -o NUL -w "HTTP %{http_code}`n" -u "$env:OCI_USER`:$env:OCI_AUTH_TOKEN" "$env:OCI_SWIFT_ENDPOINT"

# Upload (OBRIGATÓRIO usar -T; --data-binary falha com 404 no OCI)
curl.exe -s -o NUL -w "HTTP %{http_code}`n" -u "$env:OCI_USER`:$env:OCI_AUTH_TOKEN" -X PUT -H "Content-Type: application/json" -T "telemetry/station-latest.json" "$env:OCI_SWIFT_ENDPOINT/aio-telemetry/station-latest.json"

# Download
curl.exe -s -u "$env:OCI_USER`:$env:OCI_AUTH_TOKEN" "$env:OCI_SWIFT_ENDPOINT/aio-telemetry/station-latest.json"
```

## Container aio-telemetry (atualizado 10/08/2026)
- Criado via Swift API (HTTP 201) no compartimento root.
- Populado com `telemetry/station-latest.json` e `telemetry/weather-oficial.json` (HTTP 201 via `curl -T`).
- **Acesso público PENDENTE**: o Swift ACL (`X-Container-Read`) NÃO publica o bucket no OCI — é preciso definir `publicAccessType = ObjectRead`. Fazer 1× no Console: *Storage → Buckets → aio-telemetry → Edit → Visibility: Public*. Sem isso, a URL pública retorna 404.

## URL pública (após definir o bucket como Public)
```
https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/gryamzqw4zsj/b/aio-telemetry/o/station-latest.json
https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/gryamzqw4zsj/b/aio-telemetry/o/weather-oficial.json
```
- CORS liberado (`access-control-allow-origin: *`) — o app lê essas URLs com fetch direto.
- O app tenta OCI primeiro e cai no raw do GitHub se o objeto não responder (`AIO.telemetry.fallback` / `AIO.oficial.fallback`).

## Ponte automatizada (GitHub Actions)
- `.github/workflows/oci-publish.yml` publica os dois JSONs no container a cada 30 min (offset de 5 min do `dados-dinamicos`), em `push` de `telemetry/*.json` ou manualmente.
- Secrets exigidos no repo `kraefegg/AIO-Observatory`:
  | Secret | Valor |
  |---|---|
  | `OCI_SWIFT_USER` | `railsonarrd@gmail.com` |
  | `OCI_SWIFT_TOKEN` | auth token (o mesmo de `~/.oci/oci_auth.env`) |
  | `OCI_SWIFT_NAMESPACE` | `gryamzqw4zsj` |
  | `OCI_SWIFT_REGION` | `sa-saopaulo-1` |

## Próximos passos sugeridos
- Definir `publicAccessType = ObjectRead` no Console (1×) e validar o GET anônimo da URL pública.
- Adicionar os 4 secrets acima ao repositório e rodar o workflow `Ponte OCI (telemetria)`.
- ~~API nativa: gerar API key (RSA) e habilitar~~ — **FEITO (10/08/2026)**: chave RSA
  registrada (fingerprint `a5:cb:...`), `~/.oci/config` + SDK Python autenticando. Agora é
  possível usar PARs, `oci os`, Compute (VM opencode — ver `docs/oci-vm-opencode.md`), etc.
