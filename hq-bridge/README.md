# HQ Bridge (OmniRoute) — Orquestração de agentes da HQ KRAEFEGG M.O.

Mini-backend **local-first** que liga o `corporate-hq.html` (Central de Comando) a um
orquestrador multiagente via **OmniRoute**. Quando ativo, as demandas criadas na HQ são
enviadas para um agente real (provedor open-source) e o resultado volta ao painel.
Quando o bridge/OmniRoute está desligado, a HQ cai para o **modo simulado** (demo).

Node puro, **sem dependências externas** (http + fetch nativo).

---

## Arquitetura

```
corporate-hq.html ──fetch──▶ hq-bridge (server.js) ──▶ OmniRoute (/v1/chat/completions) ──▶ agente open-source
   (Nova Demanda)          NATIVE :4173                     local:20128
```

- A **HQ** envia `POST /api/hq/task` e faz polling em `GET /api/hq/task/:id`.
- O **bridge** guarda a chave/segredo, chama o OmniRoute e devolve status/resultado.
- O **OmniRoute** roteia o prompt para o melhor modelo do provider conectado
  (modelos open-source via API: DeepSeek, Qwen, Llama, OpenRouter free, etc.).

Por que um bridge intermediário e não a HQ chamando o OmniRoute direto?
OmniRoute roda em `localhost:20128` e exige chave. Um site estático (GitHub Pages)
não pode guardar segredo nem falar com `localhost`. O bridge resolve os dois.

---

## Como rodar

### 1. Suba o OmniRoute com um provider open-source
- Rode o servidor OmniRoute em `localhost:20128`:
  ```bash
  omniroute serve
  ```
- Configure um **provider open via API cloud** (o caminho mais rápido sem GPU local):
  OpenRouter (modelos `#free`), DeepSeek, Qwen, Groq etc. — no painel do OmniRoute
  em `http://localhost:20128`.
- Anote o **modelo/rota** que quer usar (ex.: `deepseek/deepseek-chat`,
  `openrouter/qwen-2.5-72b`, ou um combo `auto/...`).

### 2. Configure o bridge
```bash
cd hq-bridge
copy .env.example .env      # Windows
# preencha conforme abaixo
```

`.env`:
```ini
PORT=4173
OMNI_URL=http://localhost:20128
OMNI_API_KEY=            # chave do OmniRoute se exigida
OMNI_MODEL=              # ex.: deepseek/deepseek-chat  (deixe vazio = "auto")
HQ_TOKEN=                # opcional; se usado, a HQ deve enviar o mesmo em localStorage
```

### 3. Inicie o bridge
```bash
node server.js
# → HQ Bridge (OmniRoute) escutando em http://localhost:4173
```
Confira: `http://localhost:4173/api/hq/health` (deve retornar `"omniroute":"up"`).

### 4. Abra a HQ
Abra `corporate-hq.html`. No carregamento ela detecta o bridge:
- **OmniRoute ONLINE** → feed mostra "Hub OmniRoute ONLINE · N modelos".
- **Bridge offline** → feed mostra "Bridge HQ offline … (modo simulado)".

Crie uma demanda: se o bridge estiver online, ela vai para o agente real e o resultado
aparece na seção **Demandas** em "Resultados dos agentes" assim que concluir.

### Configurar URL do bridge na HQ
Por padrão, a HQ aponta para `http://localhost:4173`. Para mudar:
- query string: `corporate-hq.html?omni=http://SEU_HOST:4173`
- ou `localStorage.setItem('hq_omni_url', 'http://SEU_HOST:4173')`

---

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/hq/health` | Estado do bridge + OmniRoute + modelos disponíveis |
| POST | `/api/hq/task` | Cria demanda e dispara processamento assíncrono |
| GET | `/api/hq/task/:id` | Consulta status/resultado (polling) |
| GET | `/api/hq/tasks` | Lista tarefas recentes |

CORS liberado para `localhost`, `127.0.0.1` e `https://kraefegg.github.io`.
Se `HQ_TOKEN` estiver preenchido, o front deve enviar o mesmo em `localStorage`
(`hq_omni_token`) — o bridge valida via header `X-HQ-Token`.

---

## Notas de segurança
- `.env` **nunca é versionado** (está no `.gitignore` do bridge).
- O bridge guarda a chave do provider/OmniRoute no lado servidor, nunca no front.
- Armazenamento de tarefas é **em memória** (perde ao reiniciar) — suficiente para a
  PoC local; para produção, troque `store.js` por SQLite/Redis/Firestore.
