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

### Guardrails aplicados (patterns CrewAI) — `ce-strategic`
Reforco do backend estrategico com validacao de saida em cada no do LangGraph,
seguindo o guia de design de tarefas CrewAI (task-first, guardrails, structured output):

- `guardrails.mjs`: modulos de validacao reutilizaveis:
  - `checkNoSecrets` — bloqueia vazamento de chaves/tokens/senhas (inclui padrões OpenRouter/Supabase/GitHub/AWS).
  - `parseJSON` — parsing resiliente de JSON de resposta de IA (remove fances/ruído).
  - `Guardrails.{decisao, questao, parecer, resultado}` — validadores por nó (veredito válido, tamanho mínimo, campos obrigatórios).
  - `aiComGuardrail` — wrapper que reprocessa a IA até N vezes se a validação falhar (feedback ao modelo).
- Aplicado em: `CEO_Estrutura` (questão), `Conselho` (5 pareceres), `CEO_Decide` (JSON estruturado), `Resultado` (resumo executivo).
- `appendLog` agora sanitiza segredos antes de gravar no Supabase (nunca persiste chave).
- Dockerfile atualizado para copiar `guardrails.mjs`.

Teste: `node ce-strategic/test-guardrails.mjs` (8 asserções de validação).

---

## Desenvolvedor

**KRAEFEGG M.O.** é desenvolvido por **Railson Nogueira de Arruda**.

Formação:
- Engenharias — Ambiental, de Segurança, Florestal, Energias Renováveis, Perícia e Auditoria Ambiental, Mineralogia;
- Analista de Automação de Sistemas pelo SENAI;
- Embedded Systems, IoT e Edge AI;
- Generative AI, Cyber, Data, AI Engineering;
- Frontend-Backend (Fullstack): JavaScript, Python, SQL.

LinkedIn: [linkedin.com/in/railsonarruda-engineering](https://www.linkedin.com/in/railsonarruda-engineering/)