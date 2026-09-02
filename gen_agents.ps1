$ErrorActionPreference = 'Stop'
$utf8bom = New-Object System.Text.UTF8Encoding($true)
$base = Join-Path $PSScriptRoot 'kraefegg-mo\agents'
$json = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'agents_data.json'), [System.Text.Encoding]::UTF8)
$agentes = $json | ConvertFrom-Json

function Write-Utf8($path, $text) {
  [System.IO.File]::WriteAllText($path, $text, $utf8bom)
}

foreach ($a in $agentes) {
  $dir = Join-Path $base ($a.dir + '\' + $a.id)
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  $id   = $a.id
  $nome = $a.nome
  $dept = $a.dept
  $sk   = ($a.skills | ForEach-Object { '- ' + $_ }) -join [char]10
  $tl   = ($a.tools  | ForEach-Object { '- ' + $_ }) -join [char]10
  $fontes = $a.fontes
  $wf   = $a.wf

  $agentMd = @"
# AGENT $id

Nome: $nome
Departamento: $dept

## Identidade
agente_id: $id
name: $nome
department: $dept
role: Especialista tecnico
seniority: Senior
mission: Executar e apoiar entregas tecnicas do dominio com coerencia, fontes verificaveis e criterios de qualidade.
responsibilities: Analisar, projetar, documentar e apoiar a entrega em seu dominio.
tools: $($a.tools -join ', ')
knowledge_domains: $dept
deliverables: Relatorios, projetos e documentacao tecnica.
can_delegate: true
can_review: true
risk_level: medio
requires_human_validation: false

## Competencias tecnicas
$sk

## Ferramentas
$tl

## Fontes de referencia
$fontes

## Fluxo de trabalho padrao
$wf
"@
  Write-Utf8 (Join-Path $dir 'agent.md') $agentMd

  $memMd = @"
# AGENT MEMORY - $id

## Identity
$nome ($id)

## Organizational Role
Especialista em $dept.

## Mission
Executar e apoiar entregas tecnicas do dominio.

## Professional Profile
Perfil profissional baseado em referencia tecnica do dominio (nao identidade pessoal).

## Core Competencies
$sk

## Secondary Competencies
Suporte a equipe multidisciplinar da Kraefegg M.O.

## Tools
$tl

## Knowledge Domains
- $dept

## Typical Workflow
$wf

## Reference Sources
$fontes

## Active Projects / Decisions
(em aberto)

## Key Deliverables
- Relatorios tecnicos
- Documentacao tecnica
- Apoio a projetos interdisciplinares

## Lessons Learned
(em aberto)
"@
  Write-Utf8 (Join-Path $dir 'memory.md') $memMd

  $skMd = @"
# SKILLS - $id

Dominio: $dept

## Competencias principais
$sk

## Competencias secundarias / de apoio
- Integracao multidisciplinar
- Comunicacao tecnica
- Gestao de qualidade

## Ferramentas
$tl

## Fontes de referencia
$fontes
"@
  Write-Utf8 (Join-Path $dir 'skills.md') $skMd

  $ttMd = @"
# TOOLS - $id

## Ferramentas autorizadas
$tl

## Ferramentas de plataforma
- Supabase (demandas e registros)
- Google Drive (entrega de artefatos)
- IBM Code Engine (estrategico/backend)

## Regras de uso
- Usar fontes verificaveis nas analises.
- Registrar entregas e links de evidencias.
"@
  Write-Utf8 (Join-Path $dir 'tools.md') $ttMd

  $knMd = @"
# KNOWLEDGE - $id

## Dominio de conhecimento
$dept

## Conhecimentos essenciais
$sk

## Fontes de conhecimento
$fontes

## Referencias internas
- Padroes e templates da Kraefegg M.O.
- Competency matrix
- Agent registry
"@
  Write-Utf8 (Join-Path $dir 'knowledge.md') $knMd

  $wfMd = @"
# WORKFLOWS - $id

## Fluxo padrao
$wf

## Passos de execucao
1. Receber demanda e escopo.
2. Verificar fontes e referencias.
3. Executar as etapas do fluxo.
4. Registrar evidencias e artefatos.
5. Encaminhar para QA antes da entrega.

## Criterios de qualidade
- Coerencia interna
- Fontes mencionadas
- Unidades e formatos corretos
- Entrega registrada e auditavel
"@
  Write-Utf8 (Join-Path $dir 'workflows.md') $wfMd

  $qMd = @"
# QUALITY - $id

## Criterios de qualidade do dominio
- Coerencia tecnica com o dominio
- Uso de fontes verificaveis
- Dados com unidades e referencias corretas
- Documentacao clara e auditavel

## QA aplicado
O QA (nivel geral) revisa entregas antes da publicacao; excecoes seguem para revisao humana.

## Nao conformidades tipicas
- Fontes nao citadas ou invalidas.
- Inconsistencia de unidades ou dados.
- Escopo fora do solicitado.

## Melhoria continua
- Revisar licoes aprendidas e atualizar a memoria corrida do agente.
"@
  Write-Utf8 (Join-Path $dir 'quality.md') $qMd
}

Write-Output ("Provisionamento concluido. Total de perfis: " + $agentes.Count)
