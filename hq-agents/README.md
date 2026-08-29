# HQ KRAEFEGG M.O. - Equipe de Agentes (hq-agents)

Scripts do sistema de agentes que processam as demandas da HQ (Supabase),
produzem ENTREGAS REAIS (codigo, planilhas, manuais, minutas) e as sobem ao
Google Drive da conta `kraefegg.mos3@gmail.com`, registrando o link na demanda.

## Requisitos
- Windows PowerShell 5.1+.
- Variavel de ambiente `OPENROUTER_API_KEY` (chave OpenRouter).
- rclone configurado com o remote `drive-hq` (config/token OAuth em
  `C:\hq-prod\rclone\`, FORA do repositorio - segredo).

## Scripts

### 1. `hq-orquestrador.ps1` - ORQUESTRADOR DA EQUIPE (principal)
Coordena a EQUIPE de agentes em sincronia para cada demanda, com handoff
real entre etapas e estado compartilhado no Supabase (fase/progresso/log):

    PM/Oraquestrador  -> define o plano e despacha
    Analista          -> entende a demanda e define escopo
    Especialista      -> produz a ENTREGA REAL (codigo/planilha/manual)
    QA/Revisor        -> revisa, da veredito (APROVADO|CORRIGIR) e aciona loop de correcao
    Oficial de entrega-> sobe ao Google Drive e registra link no Supabase

- Loop de correcao do QA: se CORRIGIR, o parecer e repassado ao Especialista
  (ate 3 iteracoes). Aprovacao objetiva final: todos os arquivos esperados
  presentes com conteudo nao trivial (>=300 bytes).
- Modelo free com retry/backoff em rate-limit (429/403/5xx).
- Saidas de IA sao sanitizadas para ASCII antes de gravar no Supabase
  (evita 400 por encoding).

### 2. `hq-executar-demandas.ps1` - EXECUTOR (agente unico, legado)
Para cada demanda, dispara um agente executor que produz o artefato concreto
e sobe ao Drive. Sem QA/handoff. Mantido por compatibilidade.

### 3. `hq-processar-demandas.ps1` - AGENTE DE PRODUCAO (legado)
Processa demandas abertas gerando ANALISE + DOCUMENTO DE REQUISITOS (.md)
real, com upload ao Drive. Executado pelo Task Scheduler local.

## Uso
    $env:OPENROUTER_API_KEY="sk-or-..."
    .\hq-orquestrador.ps1 [-Codigo "D-19"] [-Fase analise,backlog] [-MaxN 5] [-SkipQA]

## Migracao para IBM Cloud Code Engine
- Projeto Code Engine `hq-agent-team` criado em `br-sao` (grupo de recursos Default).
- Plano: portar `hq-orquestrador.ps1` para um job Node.js (fetch a OpenRouter/Supabase,
  upload Drive via rclone empacotado com token OAuth como Secret do Code Engine),
  agendado por cron job do Code Engine. Suporte 24/7.