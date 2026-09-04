# Roteiro de Rotação & Bloqueio — Supabase e Token HQ

> Regra de ouro: **nunca** versionar chaves. Valores vivem apenas em
> `~/.hq-secrets/` (fora do git) e em secrets do Code Engine.
> Este arquivo **não contém valores**.

---

## Estado atual (2026-09-04)

- Gateway `ce-strategic` protegido: auth por token, CORS restrito, rate-limit,
  defesa ativa (deteccao de sondas/forca bruta/payload maliciosos + ban por IP).
- Dashboard `kraefegg-mo`: portal de acesso (gate), **zero** referencias a
  Supabase/chaves no cliente — tudo passa pelo gateway.
- Token do gateway rotacionado nesta sessao (antigo invalidado; novo salvo apenas
  em `~/.hq-secrets/hq-gateway.env` e no secret `hq-gateway`).
- Cron `hq-estrategico-auto` recriado com o token vigente (base64).
- Chave **publishable** do Supabase ainda existe (era usada pelo backend/job e por
  artefatos antigos) — pendências abaixo resolvem isso.

---

## Passo A — Aplicar RLS no Supabase (bloquear anon)

1. Supabase → SQL Editor → cole `supabase-rls.sql` → RUN.
2. Efeito: a publishable/anon para de ler/escrever (qualquer tentativa = RLS block).
   Isso é intencional: depois desse passo, só `service_role` acessa a tabela.

> ⚠️ Execute o **Passo B** (trocar `SUPABASE_KEY` para `service_role`) no mesmo
> momento para o backend/job/scripts não quebrarem.

---

## Passo B — Trocar a chave do backend para service_role

1. Supabase → Settings → API → copie a chave `service_role`.
   **Privilégio total — guarde só em `~/.hq-secrets/supabase.env`, jamais em código.**
2. Atualize nos 3 pontos que consomem o Supabase:

   ```powershell
   # (a) arquivo local fora do git
   Set-Content "$HOME\.hq-secrets\supabase.env" "SUPABASE_KEY=<service_role>"

   # (b) secret do Code Engine (usado pelo app e pelo job)
   ibmcloud ce secret update --name hq-supabase --from-literal "SUPABASE_KEY=<service_role>"

   # (c) env do app ce-strategic (re-liga + rebuild p/ nova revisao ler o secret)
   ibmcloud ce app update --name ce-strategic --env-from-secret hq-supabase:SUPABASE_KEY --build-source . --build-strategy dockerfile --build-size medium --rebuild

   # (d) job hq-orquestrador (envFrom aponta p/ hq-supabase; força nova revisão)
   ibmcloud ce job update --name hq-orquestrador --env-from-secret hq-supabase --build-source . --build-strategy dockerfile --build-size medium --rebuild
   ```

3. Verifique sem quebrar nada:
   - `GET /health` → `supabase: ok`
   - `POST /processar` com token → 202 (não deve acusar erro de permissão)
   - Rode um jobrun do `hq-orquestrador` (Copia o `--wait`) para confirmar que ele
     continua lendo/escrevendo a tabela com a service_role.

---

## Passo C — Rotacionar/excluir a publishable antiga

1. Supabase → Settings → API keys → **regenerar** a `anon`/`publishable` (ou excluir).
2. Motivo: ela rodou exposta no repo/sessões por meses. Com RLS ativo ela é
   inofensiva, mas rotacionar zera qualquer risco residual.
3. Confirme que nenhum artefato em uso a referencia (todas as cópias foram purgadas
   nesta sessão; busque com `rg sb_publishable` para conferir).

---

## Passo D — Higiene do histórico git (opcional, recomendado)

As chaves antigas existem em **commits passados** do repo. Para apagar do histórico:

```powershell
# exige gitleaks/git-filter-repo; reescreve o histórico (precisa force-push)
git filter-repo --invert-paths --regex 'sb_publishable|pat_[A-Za-z0-9]+|sk-or-|gho_'
```

> Impacto: altera todos os SHAs do repo — coordene com qualquer clone/CI.
> Alternativa sem reescrita: considerar as chaves já rotacionadas inválidas
> (politica aceita, pois RLS + rotação anulam o valor vazado).

---

## Passo E — Verificação final (checklist)

- [ ] `GET /health` → ok (supabase/drive/modelo)
- [ ] Sem token → 401; token errado → 401
- [ ] `GET /security` → 200; painel Cibersegurança no dashboard sem erro
- [ ] Roller: simular ataque (8 falhas/60s) → ban automático; liberar via
      `POST /security/unban`
- [ ] `rg -i 'sb_publishable|794f...' hq-agents kraefegg-mo.html` → nada
- [ ] Cron `hq-estrategico-auto` com o token vigente (Ready=True)

---

## Rotação do token HQ (gateway) — quando precisar

```powershell
$novo = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
ibmcloud ce secret update --name hq-gateway --from-literal "HQ_ACCESS_TOKEN=$novo"
ibmcloud ce app update --name ce-strategic --env-from-secret hq-gateway:HQ_ACCESS_TOKEN --build-source . --build-strategy dockerfile --build-size medium --rebuild
Set-Content "$HOME\.hq-secrets\hq-gateway.env" "HQ_ACCESS_TOKEN=$novo"
# crate nova quinzena do cron (ver Passo do cron doc): recrie a inscrição com --data-base64
```

O dashboard detecta 401 e reabre o portal automaticamente ("token rotacionado/revogado").