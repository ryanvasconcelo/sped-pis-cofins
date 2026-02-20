# 🔑 Recursos Necessários — Automação SPED PIS/COFINS

> Checklist de acessos, logins, ferramentas e materiais necessários para o desenvolvimento do projeto.

---

## Acessos e Logins

| # | Recurso | Tipo | Responsável | Status | Observações |
|---|---------|------|-------------|--------|-------------|
| 1 | **e-Auditoria** | Site web (consulta NCM) | Ryan/Wendell | ⏳ Verificar | URL: verificar com Wendell |
| 2 | **PVA (Programa Validador e Assinador)** | Software desktop (Receita Federal) | Ryan | ⏳ Baixar | Necessário para validar TXT de saída |
| 3 | **Repositório do projeto** | Git | Ryan | ✅ Criado | Projeto local |

---

## Arquivos de Exemplo

| # | Arquivo | Formato | Registros | Status | Observações |
|---|---------|---------|-----------|--------|-------------|
| 1 | `EFD CONTRIBUICOES - 01.2025.TXT` | TXT (SPED) | C191+C195 (consolidado) | ✅ Recebido | 500 produtos, ~368KB |
| 2 | `EFD CONTRIBUICOES - 02.2025.TXT` | TXT (SPED) | C191+C195 (consolidado) | ✅ Recebido | ~328KB |
| 3 | `EFD CONTRIBUICOES - 03.2025.TXT` | TXT (SPED) | C191+C195 (consolidado) | ✅ Recebido | ~387KB |
| 4 | `SpedEFD-...jan.2026.txt` | TXT (SPED) | C170 (por nota) | ✅ Recebido | 1756 itens, ~9.8MB |
| 5 | `arquivo_VARIOS_SPEDs_EXCEL...xlsx` | XLSX | Planilha consolidada | ✅ Recebido | Referência do fluxo manual |
| 6 | Planilhas Excel do Wendell (fluxo manual PROCV) | XLSX | — | ⏳ Solicitar | Base para comparação e validação |

---

## Ferramentas de Desenvolvimento

| # | Ferramenta | Uso | Status |
|---|-----------|-----|--------|
| 1 | **VS Code / IDE** | Desenvolvimento | ✅ OK |
| 2 | **Node.js / npm** | Runtime e gerenciador de pacotes | ✅ OK |
| 3 | **Git** | Versionamento | ✅ OK |
| 4 | **Agent Skills (tech-leads-club)** | Skills para desenvolvimento estruturado | ⏳ Instalar |

---

## Documentação de Referência

| # | Documento | Fonte | Status | Observações |
|---|-----------|-------|--------|-------------|
| 1 | **Guia Prático da EFD-Contribuições** | Receita Federal | ⏳ Obter | Layout oficial dos registros |
| 2 | **Tabela de CSTs PIS/COFINS** | Receita Federal | ⏳ Obter | Todos os códigos e seus significados |
| 3 | **Tabela NCM completa** | Receita Federal / MDIC | ⏳ Obter | Classificação fiscal de produtos |
| 4 | **Manual do PVA** | Receita Federal | ⏳ Obter | Regras de validação |

---

## Contatos

| Pessoa | Papel | Canal | Disponibilidade |
|--------|-------|-------|-----------------|
| **Wendell** | Stakeholder / Consultor Fiscal | ⏳ Definir | ⏳ Definir |
| **Marcelo** | Coordenador | ⏳ Definir | ⏳ Definir |
| **Ryan** | Desenvolvedor | — | Dedicado ao projeto |

---

## Ações Pendentes

- [ ] Baixar e instalar o PVA da Receita Federal
- [ ] Obter URL do e-Auditoria com Wendell
- [ ] Solicitar planilhas Excel do fluxo manual do Wendell
- [ ] Obter Guia Prático da EFD-Contribuições (layout definitivo dos registros)
- [ ] Obter tabela completa de CSTs PIS/COFINS
- [ ] Definir canais de comunicação com Wendell e Marcelo
- [ ] Instalar agent-skills para desenvolvimento estruturado
