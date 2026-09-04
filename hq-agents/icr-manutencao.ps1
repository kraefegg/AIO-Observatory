# ICR - MANUTENCAO DE QUOTA (IBM Container Registry)
# Uso:  pwsh .\icr-manutencao.ps1
# Rode APOS cada deploy/build para manter a cota estavel (plano Free = 512 MB).

$ErrorActionPreference = 'Stop'

Write-Host "== ICR: imagens ==" -ForegroundColor Cyan
ibmcloud cr image-list

Write-Host "`n== ICR: removendo imagens untagged (orfas de builds antigos) ==" -ForegroundColor Cyan
ibmcloud cr image-prune-untagged -f

# descartavel: tambem remove digests orfaos sem tag nem referencia a revision
ibmcloud cr image-prune --all-untagged -f 2>&1 | Out-Null

Write-Host "`n== ICR: quota ==" -ForegroundColor Cyan
ibmcloud cr quota

Write-Host "`n== ICR: plano ==" -ForegroundColor Cyan
ibmcloud cr plan

Write-Host "`n== Apps Code Engine ==" -ForegroundColor Cyan
ibmcloud ce app list --output json | ConvertFrom-Json | ForEach-Object {
  "{0}: {1}  (url: {2})" -f $_.metadata.name, $_.status.summary, $_.status.url
}

Write-Host "`nQuota OK. Se 'Memoria' ultrapassar 512 MB:" -ForegroundColor Yellow
Write-Host "  1) delete imagens antigas em desuso:  ibmcloud cr image-rm  <repo:tag>"
Write-Host "  2) ou aumente: ibmcloud cr plan-upgrade  (pago) /  quota-set --storage 1024"