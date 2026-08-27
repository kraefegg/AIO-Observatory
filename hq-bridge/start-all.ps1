# start-all.ps1 - Sobe OmniRoute + HQ Bridge + abre a HQ com um clique.
# Uso: right-click > "Run with PowerShell"  (ou rode via start-all.bat)
# Requisitos: node no PATH; OmniRoute CLI instalado; hq-bridge\.env configurado.

$ErrorActionPreference = 'Continue'

$PortaOmni   = 20128
$PortaBridge = 4173
$DirBridge   = $PSScriptRoot
$EntryOmni   = Join-Path $env:APPDATA 'npm\node_modules\omniroute\bin\omniroute.mjs'
$Hq          = Join-Path (Split-Path $PSScriptRoot -Parent) 'corporate-hq.html'

function PortaLivre([int]$porta) {
  return -not (Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}

Write-Host ''
Write-Host '=== KRAEFEGG M.O. - Orquestracao (OmniRoute + HQ Bridge) ===' -ForegroundColor Cyan

# ---- OmniRoute ----
if (Test-Path -LiteralPath $EntryOmni) {
  if (PortaLivre $PortaOmni) {
    Write-Host ('[OmniRoute] subindo na porta ' + $PortaOmni + ' ...') -ForegroundColor Yellow
    Start-Process -FilePath 'node' -ArgumentList @($EntryOmni, 'serve', '--no-open') -WindowStyle Hidden
    Write-Host '[OmniRoute] iniciado em background' -ForegroundColor Green
  } else {
    Write-Host '[OmniRoute] ja esta rodando na porta' $PortaOmni -ForegroundColor Green
  }
} else {
  Write-Host '[OmniRoute] NADA encontrado em' $EntryOmni -ForegroundColor Red
  Write-Host 'Instale com:  npm install -g omniroute   (ou rode "omniroute serve" manualmente)' -ForegroundColor Yellow
}

# ---- HQ Bridge ----
if (PortaLivre $PortaBridge) {
  Write-Host ('[Bridge] subindo na porta ' + $PortaBridge + ' ...') -ForegroundColor Yellow
  Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $DirBridge -WindowStyle Hidden
  Write-Host '[Bridge] iniciado em background' -ForegroundColor Green
} else {
  Write-Host '[Bridge] ja esta rodando na porta' $PortaBridge -ForegroundColor Green
}

# ---- aguarda ficar de pe (polling) e mostra health ----
Write-Host '[Health] aguardando os servicos subirem ...' -ForegroundColor Yellow
$ok = $false
$urlHealth = 'http://localhost:' + $PortaBridge + '/api/hq/health'
for ($i=0; $i -lt 45; $i++) {  # até ~90s
  Start-Sleep -Seconds 2
  try {
    $h = (Invoke-WebRequest -Uri $urlHealth -UseBasicParsing -TimeoutSec 8).Content | ConvertFrom-Json
    if ($h.ok -and $h.omniroute -eq 'up') {
      Write-Host ('[Health] OK - OmniRoute ONLINE - rota ' + $h.model) -ForegroundColor Green
      $ok = $true
      break
    } elseif ($h.ok -and $h.erro) {
      Write-Host ('[Health] bridge de pe, OmniRoute ainda subindo (' + $h.erro + ') ...') -ForegroundColor Yellow
    }
  } catch { }
}
if (-not $ok) {
  Write-Host '[Health] o OmniRoute nao ficou pronto dentro do tempo limite.' -ForegroundColor Red
  Write-Host 'Verifique se ele esta rodando (omniroute serve) e recarregue a HQ (F5).' -ForegroundColor Yellow
}

# ---- abre a HQ ----
if (Test-Path -LiteralPath $Hq) {
  Write-Host '[HQ] abrindo' $Hq -ForegroundColor Cyan
  Start-Process $Hq
} else {
  Write-Host '[HQ] corporate-hq.html nao encontrado.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host "Pronto! Se o feed da HQ nao mostrar 'Hub OmniRoute ONLINE', aguarde ~5s e recarregue (F5)." -ForegroundColor Cyan
Write-Host ''
