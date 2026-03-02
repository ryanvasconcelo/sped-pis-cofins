# Rayo — Hub Fiscal Autônomo

Sistema web local de alta performance para auditoria, automação e correção de arquivos **SPED PIS/COFINS e ICMS**. Construído para contadores e analistas fiscais da Projecont.

---

## 📁 Estrutura do Repositório

```
Rayo/
├── apps/
│   ├── rayo/           # Frontend React/Vite (porta 5173)
│   └── rayo-server/    # Backend Express + Puppeteer (porta 3001)
│
├── packages/
│   └── sped-core/      # Motor de parsing/escrita SPED (lib compartilhada)
│                       # → parser, writer, ncm-grouper, calculator
│
├── docs/               # Toda a documentação do projeto
│   ├── arquitetura.md
│   ├── briefing_kickoff.md
│   ├── roadmap.md
│   └── ...
│
├── research/           # PoCs, experimentos e materiais de descoberta
│   ├── poc-eauditoria/ # Prova de conceito inicial do scraper
│   └── novo-modulo/    # Briefings e planilhas do módulo ICMS
│
├── scripts/
│   └── deploy/         # Guias de deploy por plataforma
│
└── AI-driven-development/  # Repositório separado (metodologia de dev com IA)
```

---

## ⚡ Apps

### `apps/rayo` — Frontend
Interface React virtualizada para processar arquivos SPED no browser (100% client-side, sem upload de dados).

```bash
cd apps/rayo
npm install
npm run dev          # http://localhost:5173
```

### `apps/rayo-server` — Backend (Microserviço Local)
Servidor Express que orquestra o robô Puppeteer para scraping do e-Auditoria.

```bash
cd apps/rayo-server
# Configure as credenciais:
cp .env.example .env  # preencha EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD
node index.js         # http://localhost:3001
```

**Endpoints:**
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status do servidor |
| `GET` | `/api/queue-status` | Fila de scraping |
| `POST` | `/api/scrape-eauditoria` | Dispara o robô |

---

## 📦 Pacotes

### `packages/sped-core`
Motor de parsing e manipulação de arquivos SPED, compartilhado entre apps.

| Módulo | Função |
|--------|--------|
| `parser.js` | Faz parse de `.TXT` EFD e extrai blocos 0200, C170, C191, C195 |
| `ncm-grouper.js` | Agrupa entradas por NCM |
| `calculator.js` | Regras de base de cálculo PIS/COFINS |
| `writer.js` | Gera `.TXT` auditado idêntico ao validador |

---

## 🔒 Segurança e Privacidade

- Arquivos `.TXT` SPED são **ignorados pelo git** (dados fiscais de clientes — LGPD)
- Todo processamento do frontend é **100% client-side** (sem upload externo)
- Credenciais do e-Auditoria ficam **apenas no `.env` local** (nunca versionado)

---

## 📚 Documentação

Toda a documentação está em [`docs/`](./docs/):
- [`arquitetura.md`](./docs/arquitetura.md) — Decisões técnicas
- [`briefing_kickoff.md`](./docs/briefing_kickoff.md) — Kickoff do projeto
- [`roadmap.md`](./docs/roadmap.md) — Próximas entregas
- [`handoff-SOP-IA.md`](./docs/handoff-SOP-IA.md) — SOP de handoff entre sessões de IA

---

*Construído com obsessão por performance e design fiscalmente preciso.*
