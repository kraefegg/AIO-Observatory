# ============================================================
# HQ KRAEFEGG M.O. - Executor de Demandas (entrega REAL)
# Para cada demanda aberta, dispara um agente executor que PRODUZ
# o artefato concreto (codigo, planilha, manual, minuta) e sobe ao
# Google Drive em CEO - Demandas HQ/Entregas/<CODIGO>/, registrando
# o link na demanda (Supabase).
#
# Uso:
#   $env:OPENROUTER_API_KEY="sk-or-..."
#   .\hq-executar-demandas.ps1 [-Codigo "D-18"] [-Fase todas] [-MaxN 5]
# ============================================================
[CmdletBinding()]
param(
    [string]$Codigo = "",
    [string]$Fase = "analise,backlog",
    [int]$MaxN = 5
)

$ErrorActionPreference = "Stop"

# ---------- Config ----------
$API_BASE = "https://mrqjmdfulmnggozwjxlq.supabase.co/rest/v1"
$API_KEY  = "sb_publishable_PGW_hFT4bnzA_bIS8EPx6g_LvxWNP4Y"
$OR_KEY   = if ($env:OPENROUTER_API_KEY) { $env:OPENROUTER_API_KEY } else { $null }
if (-not $OR_KEY) { Write-Error "Defina OPENROUTER_API_KEY"; exit 1 }
$MODEL    = "minimax/minimax-m3:free"
$HDR   = @{ "apikey"=$API_KEY; "Authorization"="Bearer "+$API_KEY; "Content-Type"="application/json" }
$OHDR  = @{ "Authorization"="Bearer "+$OR_KEY; "Content-Type"="application/json" }
$WORK = "C:\hq-prod\entregas"          # stagin local (depois vai pro Drive)
$RCLONE = "C:\Users\MEU PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$RCCONF = "C:\hq-prod\rclone\rclone.conf"
$DRIVE_ROOT = "drive-hq:CEO - Demandas HQ/Entregas"

if (-not (Test-Path $WORK)) { New-Item -ItemType Directory -Path $WORK -Force | Out-Null }

function Invoke-AI {
    param([string]$Content, [int]$Tokens = 3000)
    $body = @{ model=$MODEL; messages=@(@{role="user"; content=$Content}); max_tokens=$Tokens } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" -Method Post -Headers $OHDR -Body $body -TimeoutSec 180
    return [string]$r.choices[0].message.content
}

function Push-ToDrive {
    param([string]$LocalDir)
    if (-not (Test-Path $LocalDir)) { return $null }
    $name = Split-Path $LocalDir -Leaf
    $remote = "$DRIVE_ROOT/$name"
    try {
        & $RCLONE mkdir $remote --config $RCCONF 2>$null | Out-Null
        & $RCLONE copy $LocalDir $remote --config $RCCONF --transfers 4 2>$null | Out-Null
        # pega o primeiro arquivo com ID e monta link unico
        $json = (& $RCLONE lsjson $remote --config $RCCONF 2>$null | Out-String)
        $parsed = @(ConvertFrom-Json -InputObject $json)
        $first = $null
        if ($parsed.Count -gt 0) { $first = $parsed[0] }
        elseif ($parsed) { $first = $parsed }
        if ($first -and $first.ID) {
            $id = ([string]$first.ID).Trim()
            $id = ($id -split '\s+')[0].Trim()
            if ($id -match '^[\w-]+$') { return "https://drive.google.com/open?id=$id" }
        }
        # fallback: id da pasta via lsjson do pai
        $parentJson = (& $RCLONE lsjson "$DRIVE_ROOT" --config $RCCONF 2>$null | Out-String)
        $parsedParent = @(ConvertFrom-Json -InputObject $parentJson)
        $folder = $parsedParent | Where-Object { $_.Name -eq $name -and $_.IsDir } | Select-Object -First 1
        if ($folder -and $folder.ID) { $fid = ([string]$folder.ID).Trim(); $fid = ($fid -split '\s+')[0].Trim(); return "https://drive.google.com/open?id=$fid" }
    } catch { Write-Warning "Erro upload Drive: $($_.Exception.Message)" }
    return $null
}

# ---------- Especificacao do executor por demanda ----------
# Retorna: nome da pasta + prompt do executor (gera artefatos em $dir)
function Get-ExecutorPlan {
    param([string]$codigo, [string]$titulo)
    switch ($codigo) {
        "D-16" {
            return @{
                nome = "demo-" + $codigo
                files = @("index.html","app.js","data.js","README.md")
                prompt = @"
Voce e um desenvolvedor fullstack. Produza a ENTREGA REAL (codigo-fonte) para: '$titulo'.
Crie dentro do diretorio {dir} estes arquivos:
- index.html : app web multi-site de monitoramento geoambiental (estilo single-page, pt-BR), com seletor de cliente/projeto no topo, dados por cliente simulados em JS, e marca d'agua sobre o mapa/graficos.
- app.js    : logica de roteamento por cliente, troca de dados e aplicacao de marca dagua (sobreposicao opaca) e painel de permissoes (admin/exibicao).
- data.js   : objeto com 2 projetos exemplo (nome, lat, lon, serie de indices) apenas para demonstracao.
- README.md : como implantar/rodar e como adicionar novo cliente.
Gere SOMENTE os 4 arquivos. Cada arquivo deve comecar com a linha '###FILE: <nome.ext>' e conter o conteudo completo. NAO use blocos de codigo markdown (```) dentro dos arquivos. Conteudo em pt-BR, ASCII puro (sem acentos).
"@
            }
        }
        "D-17" {
            return @{
                nome = "demo-" + $codigo
                files = @("index.html","style.css")
                prompt = @"
Voce e um especialista comercial de M&V (Measurement & Verification). Produza a ENTREGA REAL (pagina publica) para: '$titulo'.
Crie dentro de {dir}:
- index.html : pagina unica estatica, pt-BR, para prospeccao: hero com proposta de valor, secao de dados de demonstracao (grafico simples em canvas), copy tecnico-comercial, lista de beneficios, e 2 CTAs ('Agendar demo' e 'Solicitar proposta') com links #contato.
- style.css  : estilo moderno responsivo.
Gere SOMENTE os 2 arquivos. Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@
            }
        }
        "D-18" {
            return @{
                nome = "demo-" + $codigo
                files = @("BOM.csv","manual-calibracao.md")
                prompt = @"
Voce e um engenheiro/analista de instrumentacao. Produza a ENTREGA REAL para: '$titulo'.
Crie dentro de {dir}:
- BOM.csv : planilha (CSV, delimitador ';') com colunas: categoria,item,especificacao,fornecedor,quantidade,unidade,criticidade. Liste >=15 componentes de uma estacao meteorologica (sensores de temp/umidade/pressao/vento/radiacao/chuvas, datalogger, suporte, cabos, painel solar, bateria, etc).
- manual-calibracao.md : manual de calibracao completo (objetivo, periodicidade por sensor, instrumentos de referencia, procedimento passo a passo, tolerancias, criterios de aprovacao, formulario de registro).
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@
            }
        }
        "D-19" {
            return @{
                nome = "demo-" + $codigo
                files = @("precificacao.csv","proposta-template.md","contrato-14133.md")
                prompt = @"
Voce e um consultor comercial/juridico. Produza a ENTREGA REAL para: '$titulo' (Kit Comercial Digital: proposta PDF, contrato de assinatura 14.133 e precificacao).
Crie dentro de {dir}:
- precificacao.csv : tabela de precos (delimitador ';'), colunas: item,descricao,tipo(assinatura|implementacao|suporte),periodicidade,preco_brl. Liste >=8 itens realistas do kit (plataforma, pacotes de horas, suporte, treinamento, onboarding).
- proposta-template.md : template de proposta com capa, escopo, entregaveis, cronograma, investimento (referenciando a tabela) e condicoes comerciais.
- contrato-14133.md : minuta de contrato de assinatura referenciando Lei 14.133/2021 (objeto, vigencia, valor, obrigacoes, rescisao, foro).
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@
            }
        }
        "D-21" {
            return @{
                nome = "demo-" + $codigo
                files = @("index.html","README.md")
                prompt = @"
Voce e um desenvolvedor de sistemas ambientais. Produza a ENTREGA REAL (esqueleto funcional) para: '$titulo' (Sistema de engenharia ambiental).
Crie dentro de {dir}:
- index.html : dashboard web unica pagina pt-BR abrangendo SST (acidentes, EPIs, treinamentos), Ambiental (monitoramento, residuos, riscos) e Monitoramento (sensores IoT, agua/ar) com cards, tabelas de exemplo e gerenciador simples em JS.
- README.md : arquitetura, modulos planejados e proximos passos de evolucao.
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@
            }
        }
        default { return $null }
    }
}

# ---------- Busca demandas ----------
$fases = $Fase -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($Codigo) {
    $filtro = "codigo=eq.$Codigo"
} else {
    $orFases = ($fases | ForEach-Object { "fase.eq.$_" }) -join ","
    $filtro = "or=($orFases)"
}
$uri = "$API_BASE/demandas?$filtro&select=codigo,titulo,fase,prioridade,progresso,responsavel,descricao&order=id.asc&limit=$MaxN"
Write-Host "`n==> Buscando demandas para EXECUCAO ($Fase)..." -ForegroundColor Cyan
$demandas = @()
try { $demandas = (Invoke-RestMethod -Uri $uri -Headers $HDR -TimeoutSec 20) } catch { Write-Error "Falha busca: $($_.Exception.Message)"; exit 1 }
if ($demandas.Count -eq 0) { Write-Host "Nenhuma demanda para executar." -ForegroundColor Yellow; exit 0 }

foreach ($d in $demandas) {
    $plan = Get-ExecutorPlan -codigo $d.codigo -titulo $d.titulo
    if (-not $plan) { Write-Host "Sem executor definido para $($d.codigo) - pulando." -ForegroundColor Yellow; continue }
    Write-Host "`n=== EXECUTANDO $($d.codigo): $($d.titulo) ===" -ForegroundColor Magenta

    $dir = Join-Path $WORK ($plan.nome)
    if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null

    $prompt = $plan.prompt.Replace("{dir}", $dir)
    $resumo = ""
    try {
        $out = Invoke-AI -Content $prompt -Tokens 6000
        # parse por ###FILE
        $blocos = [regex]::Split($out, "(?m)^###FILE:\s*([^\r\n]+)")
        # blocos: [0]=prefixo, [1]=nome1, [2]=conteudo1, [3]=nome2, [4]=conteudo2, ...
        $i = 1
        while ($i -lt $blocos.Count -and $i+1 -lt $blocos.Count) {
            $nome = $blocos[$i].Trim()
            if ($nome) {
                # sanitiza: remove caracteres invalidos p/ Windows e separa subpastas
                $nome = $nome -replace '[\\/]', '\'
                $nome = $nome -replace '[<>\*\|":]', ''
                $nome = $nome -replace '\s+', ' ' -replace '\s*$',''
                $sub = $nome -split '[\\/]'
                $target = $dir
                for ($s=0; $s -lt $sub.Count-1; $s++){ $target = Join-Path $target $sub[$s] }
                if (-not (Test-Path $target)) { New-Item -ItemType Directory -Path $target -Force | Out-Null }
                $fp = Join-Path $target $sub[$sub.Count-1]
                $conteudo = $blocos[$i+1]
                $conteudo = $conteudo -replace '(?s)^\s*```[^\n]*\n','' -replace "(?s)\n```\s*$",''
                [System.IO.File]::WriteAllText($fp, $conteudo, (New-Object System.Text.UTF8Encoding($false)))
                Write-Host "  arquivo: $($sub[$sub.Count-1]) ($((Get-Item $fp).Length) bytes)" -ForegroundColor Gray
            }
            $i += 2
        }
        $resumo = $out.Substring(0, [Math]::Min(220, $out.Length))
    } catch {
        Write-Warning "Falha executor $($d.codigo): $($_.Exception.Message)"
        continue
    }

    # upload ao Drive
    if ($plan.files | Where-Object { Test-Path (Join-Path $dir $_) }) {
        $link = Push-ToDrive -LocalDir $dir
    } else { $link = $null }
    if (-not $link) { $link = (Join-Path $DRIVE_ROOT ($plan.nome)) }

    # registra link na demanda
    try {
        $atual = (Invoke-RestMethod -Uri "$API_BASE/demandas?codigo=eq.$($d.codigo)&select=descricao" -Headers $HDR -TimeoutSec 20)
        $orig = if ($atual.descricao) { [string]$atual.descricao } else { "" }
        if ($orig -match '(?s)\[IA AGENTE\].*') { $base = ($orig -replace '(?s)\s*\[IA AGENTE\].*','').Trim() } else { $base = $orig.Trim() }
        $nova = "$base | [IA AGENTE] ENTREGA REAL em $(Get-Date -Format 'yyyy-MM-dd HH:mm') | DOC: $link"
        Invoke-RestMethod -Uri "$API_BASE/demandas?codigo=eq.$($d.codigo)" -Method Patch -Headers $HDR -Body (@{ descricao=$nova } | ConvertTo-Json -Compress) -TimeoutSec 20 | Out-Null
        Write-Host "  ENTREGA: $link" -ForegroundColor Green
    } catch { Write-Warning "Falha ao registrar $($d.codigo): $($_.Exception.Message)" }
}

Write-Host "`nExecutor concluido." -ForegroundColor Cyan
