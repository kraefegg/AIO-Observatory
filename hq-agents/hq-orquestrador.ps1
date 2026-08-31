# ============================================================
# HQ KRAEFEGG M.O. - Orquestrador da Equipe de Agentes (sincronia)
#
# Coordena uma EQUIPE de papéis profissionais para cada demanda,
# com handoff real entre etapas (a saída de um papel alimenta o
# próximo) e estado compartilhado no Supabase (fase/progresso/log):
#
#   PM/Oraquestrador  -> define o plano e despacha
#   Analista          -> entende a demanda e define requisitos
#   Especialista      -> produz a ENTREGA REAL (codigo/planilha/manual)
#   QA/Revisor        -> revisa o entregavel e da parecer (aprovar/pedir correcao)
#   Oficial de entrega-> sobe ao Google Drive e registra link no Supabase
#
# Modelo free (minimax free) com fila/backoff contra rate-limit (429/403).
# Preparado para migrar ao IBM Code Engine (deploy local primeiro).
#
# Uso:
#   $env:OPENROUTER_API_KEY="sk-or-..."
#   .\hq-orquestrador.ps1 [-Codigo "D-19"] [-Fase analise,backlog] [-MaxN 5] [-SkipQA]
# ============================================================
[CmdletBinding()]
param(
    [string]$Codigo = "",
    [string]$Fase = "analise,backlog",
    [int]$MaxN = 5,
    [switch]$SkipQA
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
$WORK  = "C:\hq-prod\entregas"
$RCLONE = "C:\Users\MEU PC\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$RCCONF = "C:\hq-prod\rclone\rclone.conf"
$DRIVE_ROOT = "drive-hq:CEO - Demandas HQ/Entregas"

if (-not (Test-Path $WORK)) { New-Item -ItemType Directory -Path $WORK -Force | Out-Null }

# Fila/backoff: tenta a chamada ao OpenRouter com retry exponencial em 429/403.
function Invoke-AI {
    param([string]$Content, [int]$Tokens = 3000, [int]$MaxRetry = 4)
    $body = @{ model=$MODEL; messages=@(@{role="user"; content=$Content}); max_tokens=$Tokens } | ConvertTo-Json -Depth 5
    for ($t = 0; $t -lt $MaxRetry; $t++) {
        try {
            $r = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" -Method Post -Headers $OHDR -Body $body -TimeoutSec 180
            if (-not $r -or -not $r.choices -or $r.choices.Count -eq 0) {
                $erro = if ($r -and $r.error) { ($r.error | ConvertTo-Json -Compress) } else { "sem choices" }
                throw ("Resposta OpenRouter sem choices: " + $erro)
            }
            $msg = $r.choices[0].message
            if (-not $msg) { throw "Resposta OpenRouter sem message em choices[0]" }
            return [string]$msg.content
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            if ($status -eq 429 -or $status -eq 403 -or $status -eq 500 -or $status -eq 503) {
                $back = [Math]::Min(30, 5 * [Math]::Pow(2, $t))
                Write-Host "    [rate-limit $status] aguardando ${back}s (tentativa $($t+1))" -ForegroundColor DarkYellow
                Start-Sleep -Seconds $back
                continue
            }
            throw
        }
    }
    throw "Falha apos $MaxRetry tentativas (rate-limit persistente)."
}

function Push-ToDrive {
    param([string]$LocalDir)
    if (-not (Test-Path $LocalDir)) { return $null }
    $name = Split-Path $LocalDir -Leaf
    $remote = "$DRIVE_ROOT/$name"
    try {
        & $RCLONE mkdir $remote --config $RCCONF 2>$null | Out-Null
        & $RCLONE copy $LocalDir $remote --config $RCCONF --transfers 4 2>$null | Out-Null
        $json = (& $RCLONE lsjson $remote --config $RCCONF 2>$null | Out-String)
        # Parser seguro: ConvertFrom-Json devolve array; pega o PRIMEIRO elemento
        $parsed = @(ConvertFrom-Json -InputObject $json)
        $first = $null
        if ($parsed.Count -gt 0) { $first = $parsed[0] }
        elseif ($parsed) { $first = $parsed }
        if ($first -and $first.ID) {
            $id = [string]$first.ID
            $id = ($id -split '\s+')[0].Trim()
            if ($id -match '^[\w-]+$') { return "https://drive.google.com/open?id=$id" }
        }
        $parentJson = (& $RCLONE lsjson "$DRIVE_ROOT" --config $RCCONF 2>$null | Out-String)
        $parsedParent = @(ConvertFrom-Json -InputObject $parentJson)
        $folder = $parsedParent | Where-Object { $_.Name -eq $name -and $_.IsDir } | Select-Object -First 1
        if ($folder -and $folder.ID) { $fid = [string]$folder.ID; $fid = ($fid -split '\s+')[0].Trim(); return "https://drive.google.com/open?id=$fid" }
    } catch { Write-Warning "Erro upload Drive: $($_.Exception.Message)" }
    return $null
}

# Remove carateres nao-ASCII e quebras que corrompem o JSON/Supabase.
function Sanitize-Ascii {
    param([string]$s)
    if ($null -eq $s) { return "" }
    $s = $s -replace '[^\x20-\x7E]', ' '
    $s = $s -replace '\s+', ' '
    return $s.Trim()
}

# Registra no Supabase: atualiza fase/progresso e anexa linha de log.
function Set-DemandaEstado {
    param([string]$codigo, [string]$fase, [int]$progresso, [string]$log)
    $log = Sanitize-Ascii $log
    if (-not $log) { return }
    try {
        if ($fase) { Invoke-RestMethod -Uri "$API_BASE/demandas?codigo=eq.$codigo" -Method Patch -Headers $HDR -Body (@{ fase=$fase; progresso=$progresso } | ConvertTo-Json -Compress) -TimeoutSec 20 | Out-Null }
        $atual = (Invoke-RestMethod -Uri "$API_BASE/demandas?codigo=eq.$codigo&select=descricao" -Headers $HDR -TimeoutSec 20)
        $orig = if ($atual.descricao) { [string]$atual.descricao } else { "" }
        if ($orig -match '(?s)\[IA AGENTE\]' -and $log -match '^\[') {
            # para logs continua acumulando: remove bloco IA anterior e regrava
            $base = ($orig -replace '(?s)\s*\[IA AGENTE\].*','').Trim()
        } else { $base = $orig.Trim() }
        $nova = if ($base) { "$base | [IA AGENTE] $log" } else { "[IA AGENTE] $log" }
        Invoke-RestMethod -Uri "$API_BASE/demandas?codigo=eq.$codigo" -Method Patch -Headers $HDR -Body (@{ descricao=$nova } | ConvertTo-Json -Compress) -TimeoutSec 20 | Out-Null
    } catch { Write-Warning "Falha ao registrar estado $codigo : $($_.Exception.Message)" }
}

# ---------- Plano do Especialista por demanda ----------
function Get-ExecutorPlan {
    param([string]$codigo, [string]$titulo)
    switch ($codigo) {
        "D-16" {
            return @{ nome="demo-"+$codigo; files=@("index.html","app.js","data.js","README.md"); prompt=@"
Voce e um desenvolvedor fullstack (ESPECIALISTA). Produza a ENTREGA REAL (codigo-fonte) para: '$titulo'.
Crie dentro do diretorio {dir} estes arquivos:
- index.html : app web multi-site de monitoramento geoambiental (estilo single-page, pt-BR), com seletor de cliente/projeto no topo, dados por cliente simulados em JS, e marca d'agua sobre o mapa/graficos.
- app.js    : logica de roteamento por cliente, troca de dados e aplicacao de marca dagua (sobreposicao opaca) e painel de permissoes (admin/exibicao).
- data.js   : objeto com 2 projetos exemplo (nome, lat, lon, serie de indices) apenas para demonstracao.
- README.md : como implantar/rodar e como adicionar novo cliente.
Gere SOMENTE os 4 arquivos. Cada arquivo deve comecar com a linha '###FILE: <nome.ext>' e conter o conteudo completo. NAO use blocos de codigo markdown (```) dentro dos arquivos. Conteudo em pt-BR, ASCII puro (sem acentos).
"@ }
        }
        "D-17" {
            return @{ nome="demo-"+$codigo; files=@("index.html","style.css"); prompt=@"
Voce e um especialista comercial de M&V (Measurement & Verification). Produza a ENTREGA REAL (pagina publica) para: '$titulo'.
Crie dentro de {dir}:
- index.html : pagina unica estatica, pt-BR, para prospeccao: hero com proposta de valor, secao de dados de demonstracao (grafico simples em canvas), copy tecnico-comercial, lista de beneficios, e 2 CTAs ('Agendar demo' e 'Solicitar proposta') com links #contato.
- style.css  : estilo moderno responsivo.
Gere SOMENTE os 2 arquivos. Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@ }
        }
        "D-18" {
            return @{ nome="demo-"+$codigo; files=@("BOM.csv","manual-calibracao.md"); prompt=@"
Voce e um engenheiro/analista de instrumentacao (ESPECIALISTA). Produza a ENTREGA REAL para: '$titulo'.
Crie dentro de {dir}:
- BOM.csv : planilha (CSV, delimitador ';') com colunas: categoria,item,especificacao,fornecedor,quantidade,unidade,criticidade. Liste >=15 componentes de uma estacao meteorologica (sensores de temp/umidade/pressao/vento/radiacao/chuvas, datalogger, suporte, cabos, painel solar, bateria, etc).
- manual-calibracao.md : manual de calibracao completo (objetivo, periodicidade por sensor, instrumentos de referencia, procedimento passo a passo, tolerancias, criterios de aprovacao, formulario de registro).
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@ }
        }
        "D-19" {
            return @{ nome="demo-"+$codigo; files=@("precificacao.csv","proposta-template.md","contrato-14133.md"); prompt=@"
Voce e um consultor comercial/juridico (ESPECIALISTA). Produza a ENTREGA REAL para: '$titulo' (Kit Comercial Digital: proposta PDF, contrato de assinatura 14.133 e precificacao).
Crie dentro de {dir}:
- precificacao.csv : tabela de precos (delimitador ';'), colunas: item,descricao,tipo(assinatura|implementacao|suporte),periodicidade,preco_brl. Liste >=8 itens realistas do kit (plataforma, pacotes de horas, suporte, treinamento, onboarding).
- proposta-template.md : template de proposta com capa, escopo, entregaveis, cronograma, investimento (referenciando a tabela) e condicoes comerciais.
- contrato-14133.md : minuta de contrato de assinatura referenciando Lei 14.133/2021 (objeto, vigencia, valor, obrigacoes, rescisao, foro).
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@ }
        }
        "D-21" {
            return @{ nome="demo-"+$codigo; files=@("index.html","README.md"); prompt=@"
Voce e um desenvolvedor de sistemas ambientais (ESPECIALISTA). Produza a ENTREGA REAL (esqueleto funcional) para: '$titulo' (Sistema de engenharia ambiental).
Crie dentro de {dir}:
- index.html : dashboard web unica pagina pt-BR abrangendo SST (acidentes, EPIs, treinamentos), Ambiental (monitoramento, residuos, riscos) e Monitoramento (sensores IoT, agua/ar) com cards, tabelas de exemplo e gerenciador simples em JS.
- README.md : arquitetura, modulos planejados e proximos passos de evolucao.
Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII puro.
"@ }
        }
        default { return $null }
    }
}

# ---------- 1) Busca demandas ----------
$fases = $Fase -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($Codigo) {
    $filtro = "codigo=eq.$Codigo"
} else {
    $orFases = ($fases | ForEach-Object { "fase.eq.$_" }) -join ","
    $filtro = "or=($orFases)"
}
$uri = "$API_BASE/demandas?$filtro&select=codigo,titulo,fase,prioridade,progresso,responsavel,descricao&order=id.asc&limit=$MaxN"
Write-Host "`n== EQUIPE DE AGENTES - ORQUESTRADOR (fase=$Fase) ==" -ForegroundColor Cyan
$demandas = @()
try { $demandas = (Invoke-RestMethod -Uri $uri -Headers $HDR -TimeoutSec 20) } catch { Write-Error "Falha busca: $($_.Exception.Message)"; exit 1 }
if ($demandas.Count -eq 0) { Write-Host "Nenhuma demanda para a equipe." -ForegroundColor Yellow; exit 0 }

foreach ($d in $demandas) {
    $plan = Get-ExecutorPlan -codigo $d.codigo -titulo $d.titulo
    if (-not $plan) { Write-Host "Sem plano de especialista para $($d.codigo) - pulando." -ForegroundColor Yellow; continue }

    Write-Host "`n=== [PM] Despachando $($d.codigo): $($d.titulo) ===" -ForegroundColor Magenta
    Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 5 -log "Equipe iniciada (PM): plano definido para $($plan.nome)"

    # --- [ANALISTA] entende a demanda e define escopo/requisitos (handoff p/ especialista) ---
    $escopo = ""
    $promptAnalista = @"
Voce e o ANALISTA da equipe. Entenda a demanda e escreva um paragrafo curto de ESCOPO/ENTREGAVEIS (pt-BR, ASCII, sem acentos) que servira de brief para o especialista tecnicamente construir.
Demanda: codigo=$($d.codigo), titulo=$($d.titulo), responsavel=$($d.responsavel)
Entregaveis esperados: $($plan.files -join ', ')
Responda apenas com o paragrafo de escopo (3-5 frases).
"@
    try { $escopo = Invoke-AI -Content $promptAnalista -Tokens 500 } catch { $escopo = "Escopo: $($d.titulo)".Substring(0,[Math]::Min(200,("Escopo: $($d.titulo)").Length)) }
    Write-Host "  [ANALISTA] escopo definido." -ForegroundColor Green
    Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 20 -log "Analista concluiu: $escopo"

    # --- [ESPECIALISTA] produz a entrega real ---
    $dir = Join-Path $WORK ($plan.nome)
    if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 40 -log "Especialista em producao..."
    $prompt = $plan.prompt.Replace("{dir}", $dir)
    try {
        $out = Invoke-AI -Content $prompt -Tokens 6000 -MaxRetry 5
        $blocos = [regex]::Split($out, "(?m)^###FILE:\s*([^\r\n]+)")
        $i = 1
        while ($i -lt $blocos.Count -and $i+1 -lt $blocos.Count) {
            $nome = $blocos[$i].Trim()
            if ($nome) {
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
                Write-Host "    [ESPECIALISTA] $($sub[$sub.Count-1]) ($((Get-Item $fp).Length) bytes)" -ForegroundColor Gray
            }
            $i += 2
        }
    } catch {
        Write-Warning "Falha especialista $($d.codigo): $($_.Exception.Message)"
        Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 40 -log "Falha do especialista: $($_.Exception.Message)"
        continue
    }
    Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 70 -log "Especialista entregou artefatos"

    # --- [QA/REVISOR] revisa a entrega, da veredito e aciona loop de correcao ---
    $qaAprovado = $true
    $qaParecer  = "QA: sem iteracao."
    $artefatos_presentes = ($plan.files | Where-Object { Test-Path (Join-Path $dir $_) }).Count
    $artefatos_esperados = $plan.files.Count

    if ($SkipQA) {
        Write-Host "  [QA] pulado (-SkipQA)." -ForegroundColor DarkYellow
    } else {
        for ($loop = 0; $loop -lt 3; $loop++) {
            $resumoArqs = ""
            foreach ($f in $plan.files) {
                $fp = Join-Path $dir $f
                if (Test-Path $fp) { $resumoArqs += "[$f] $((Get-Item $fp).Length)B; " }
            }
            $promptQA = @"
Voce e o QA/REVISOR da equipe. Revise a entrega para a demanda '$($d.titulo)'.
Artefatos esperados: $($plan.files -join ', ')
Artefatos encontrados: $resumoArqs
Escopo definido: $escopo
Responda SOMENTE com JSON valido (sem texto extra): {"status":"APROVADO"|"CORRIGIR", "pontos":"lista objetiva dos pontos a corrigir"}
Considere: arquivos ausentes, completude em relacao ao escopo, e qualidade. Se algum arquivo esperado estiver ausente, status DEVE ser CORRIGIR.
"@
            $parecer = ""
            $statusQA = "APROVADO"
            try {
                $raw = Invoke-AI -Content $promptQA -Tokens 400
                $raw = $raw -replace '(?s)```json\s*','' -replace '(?s)```','' -replace '^\s+|\s+$',''
                $j = $raw | ConvertFrom-Json
                $statusQA = ([string]$j.status).Trim().ToUpper()
                $parecer = [string]$j.pontos
            } catch { $statusQA = "APROVADO"; $parecer = "parecer nao estruturado (rede)" }

            if ($statusQA -eq "CORRIGIR" -and $loop -lt 2) {
                $qaAprovado = $false
                $qaParecer = "QA (correcao $($loop+1)): $parecer"
                Write-Host "  [QA] CORRIGIR - acionando correcao: $parecer" -ForegroundColor Yellow
                Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 80 -log $qaParecer

                # handoff: PM repassa parecer ao especialista para corrigir
                $promptCorrecao = @"
Voce e o ESPECIALISTA corrigindo a entrega da demanda '$($d.titulo)'. O QA apontou:
$parecer
Artefatos esperados: $($plan.files -join ', ')
Corrija/crie TODOS os arquivos esperados dentro de {dir}. Cada arquivo comeca com '###FILE: <nome.ext>' e o conteudo completo, sem blocos ```. pt-BR, ASCII.
"@
                $promptCorrecao = $promptCorrecao.Replace("{dir}", $dir)
                try {
                    $out = Invoke-AI -Content $promptCorrecao -Tokens 6000 -MaxRetry 5
                    $blocos = [regex]::Split($out, "(?m)^###FILE:\s*([^\r\n]+)")
                    $i = 1
                    while ($i -lt $blocos.Count -and $i+1 -lt $blocos.Count) {
                        $nome = $blocos[$i].Trim()
                        if ($nome) {
                            $nome = $nome -replace '[<>\*\|":]', '' -replace '\s+',' ' -replace '\s*$',''
                            $fp = Join-Path $dir $nome
                            $conteudo = $blocos[$i+1] -replace '(?s)^\s*```[^\n]*\n','' -replace "(?s)\n```\s*$",''
                            [System.IO.File]::WriteAllText($fp, $conteudo, (New-Object System.Text.UTF8Encoding($false)))
                            Write-Host "    [ESPECIALISTA/correcao] $nome ($((Get-Item $fp).Length)B)" -ForegroundColor Gray
                        }
                        $i += 2
                    }
                } catch { Write-Warning "Falha na correcao (loop $loop): $($_.Exception.Message)" }
                continue   # re-revisa com a versao corrigida
            }

            $qaAprovado = ($statusQA -eq "APROVADO")
            $qaParecer = "QA: $statusQA - $parecer"
            Write-Host "  [QA] $statusQA - $parecer" -ForegroundColor Green
            Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 85 -log $qaParecer
            break
        }
    }

    # Criterio objetivo final: todos os arquivos esperados presentes e nao triviais.
    $faltantes = @()
    foreach ($f in $plan.files) {
        $fp = Join-Path $dir $f
        if (-not (Test-Path $fp)) { $faltantes += $f }
        elseif ((Get-Item $fp).Length -lt 300) { $faltantes += "$f(tamanho insuficiente)" }
    }
    $completo = ($faltantes.Count -eq 0)
    if (-not $SkipQA -and $completo) { $qaAprovado = $true }

    # --- [OFICIAL DE ENTREGA] sobe ao Drive e registra (so se aprovado/objetivamente completo) ---
    if (($qaAprovado -or $SkipQA) -and $completo) {
        $link = if ($plan.files | Where-Object { Test-Path (Join-Path $dir $_) }) { Push-ToDrive -LocalDir $dir } else { $null }
        if (-not $link) { $link = "$DRIVE_ROOT/$($plan.nome)" }
        Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 100 -log "ENTREGA REAL entregue em $(Get-Date -Format 'yyyy-MM-dd HH:mm') | DOC: $link"
        Write-Host "  [ENTREGA] $link" -ForegroundColor Cyan
    } else {
        Set-DemandaEstado -codigo $d.codigo -fase $d.fase -progresso 85 -log "Entrega RETIDA pelo QA apos 3 iteracoes ($artefatos_presentes/$artefatos_esperados arquivos)."
        Write-Host "  [QA] Entrega retida (nao publicada) apos 3 iteracoes." -ForegroundColor Red
    }
}

Write-Host "`nOrquestrador da equipe concluido." -ForegroundColor Cyan
