# Rayo — Hub Fiscal e Contábil

Sistema web local de alta performance para auditoria, automação fiscal e cruzamento contábil. Construído para contadores e analistas fiscais da Projecont.

---

## 🧩 Módulos de Negócio

O Rayo Hub é composto por 3 módulos principais, acessados via uma interface unificada na nuvem/local:

1. **Auditor PIS/COFINS**: Leitura ultrarrápida de arquivos SPED EFD-Contribuições, edição tabular virtualizada (registros 0200, C170, C191, C195), recálculo autônomo e integração com automação RPA do e-Auditoria para recuperação de crédito em massa.
2. **Auditor ICMS**: Motor de alertas baseado em cruzamentos pesados e verificações de crédito ou débito do ICMS, entre o que foi emitido nas malhas e o que consta em ferramentas contábeis de gestão (ERP).
3. **Auditor Contas e Razão**: Módulo novato focado diretamente na reconciliação contábil entre Razão Analítico e relatórios Financeiros (Sifin). Evidencia rapidamente falsos negativos e discrepâncias pontuais.

---

## 📁 Estrutura do Repositório

```
Rayo/
├── apps/
│   ├── rayo/           # Frontend React/Vite (Dashboard e Visualizador de Dados)
│   └── rayo-server/    # Backend Express + Puppeteer (Robô de Consulta RPA)
│
├── packages/
│   └── sped-core/      # Motor unificado de parsing/escrita de estruturas de TXT (SPED)
│
├── docs/               # Documentação estruturada do projeto (v2)
│   ├── 00-general/     # Visão global: objetivo e escopos essenciais
│   ├── contas-razao/   # Módulo: Auditor de Contas e Razão
│   ├── icms/           # Módulo: Auditor ICMS
│   └── pis-cofins/     # Módulo: Auditor PIS/COFINS
│
├── scripts/
│   └── deploy/         # Guias de deploy e implantação
│
└── AI-driven-development/  # Repo embarcado de metodologia guiado por IA (Framework SOP)
```

---

## ⚡ Como Rodar o Hub

### Interface do Web App (apps/rayo)
App React + Vite com processador virtualizado no browser (100% Client-side). Sem dependência externa.

```bash
cd apps/rayo
npm install
npm run dev          # http://localhost:5173
```

### Motor de Automação e Fila (apps/rayo-server)
Servidor local com Express.js que hospeda as sessões de Puppeteer (scraping headless na plataforma Gov/e-Auditoria).

```bash
cd apps/rayo-server
# Configure suas credenciais exclusivas
cp .env.example .env  # Defina seu LOGIN_EAUDITORIA e SENHA_EAUDITORIA
npm install
node index.js         # Exposto localmente na porta 3001
```

---

## 🔒 Princípios Adotados

- **Privacidade e LGPD**: Toda tabela cruzada ou manipulada acontece no navegador do analista ou no motor local (`rayo-server`). Nenhum arquivo sensível de SPED ou folha financeira .CSV é exportado para nuvens ou salva em banco de dados perene do sistema.
- **Desenvolvimento Guiado (SOP-IA)**: Seguimos rigidamente a metodologia descrita em `AI-driven-development`, sem desvios de feature. Toda nova alteração requer o assentamento em `objective.md` e `scope.md` correspondente.
- **Transação Estrita**: Arquivos devolvidos respeitam 100% da diagramação original da Receita Federal (PVA), garantindo "Round-Trip Fidelity".
