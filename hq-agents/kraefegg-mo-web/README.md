# KRAEFEGG M.O. — Portal Web

Painel corporativo da firma **KRAEFEGG M.O. — Tech-AI & Engineering Solutions**
(Mining · Energy · Environmental · Sistema Multiagente), servido como site
estático em **IBM Code Engine (br-sao)**.

## Identidade visual

Paleta da firma aplicada no dashboard: **Preto · Vermelho (#E10600) · Branco · Amarelo (#FFCA28)**.

| Cor | Hex | Uso |
|---|---|---|
| Preto | `#0d0f11` / `#14181c` | fundos dark, hero/banner, rolagens e hovers |
| Vermelho | `#E10600` (primário) · `#A30000` (profundo) | acessos, destaques, marca, tags de status |
| Branco | `#FFFFFF` | fundos de superfícies e texto principal |
| Amarelo | `#FFCA28` · `#C79600` (texto) | positivo/ok, destaques secundários, chips |

O vermelho substitui o antigo azul/vermelho do template; o amarelo assume os
rótulos positivos/ok (ex.: `✓ Concluída`, status online). Novos componentes
devem reusar as variáveis de `:root` em `kraefegg-mo.html`.

## Estrutura

- `kraefegg-mo.html` — app todo-in-one (CSS + marcação + JS client-side).
- `sw.js` — Service Worker network-first (offline degrada para cache). Bump de `CACHE` forca atualizacao dos clientes.
- `nginx.conf.template` / `Dockerfile` — empacota como estático (nginx, porta 8080).
- `manifest.webmanifest`, `icon.svg`, `logo.png`, `banner.png` — PWA/identidade.

## Deploy (Code Engine)

```bash
ibmcloud ce application update --name kraefegg-mo \
  --build-source . --build-strategy dockerfile --build-size medium --rebuild \
  --app-size S --cpu 0.25 --memory 0.5
```

A URL do backend estratégico é configurada por `const ESTRATEGIA_URL` em
`kraefegg-mo.html` (gateway `ce-strategic`, auth via header `X-HQ-Token`).

## Como editar / testar

1. Edite `kraefegg-mo.html` (cores reusam as variáveis de `:root`).
2. Bumpe `CACHE` em `sw.js` ao mudar o shell (clients precisam de Ctrl+F5).
3. Rebuild do app (acima) e valide em `https://kraefegg-mo.2e4s1hfdcw14.br-sao.codeengine.appdomain.cloud`.

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