# 🗺️ Roadmap — Automação SPED PIS/COFINS

## Fase 1 — MVP (Entrega #1)

> **Objetivo:** Substituir o fluxo manual de Excel por uma interface funcional

| Entrega | Descrição | Critério de Aceite |
|---------|-----------|-------------------|
| Parser SPED | Ler arquivo TXT e extrair registros 0200, C170, C191, C195 | Parse 100% dos registros sem perda de dados |
| Interface de Visualização | Tabela com Código, Descrição, NCM, CST PIS, CST COFINS | Dados corretos comparados com Excel manual |
| Edição de CSTs | Campos editáveis para CST PIS e CST COFINS | Alteração persiste e reflete no export |
| Exportação TXT | Gerar arquivo TXT com estrutura SPED válida | PVA aceita sem erros de estrutura |
| Round-trip Test | Importar → Exportar sem mudanças → Diff zero | Arquivo idêntico byte a byte |

**Marco:** Wendell consegue processar 1 arquivo real do início ao fim pelo sistema.

---

## Fase 2 — Inteligência (Entrega #2)

> **Objetivo:** Reduzir trabalho manual com sugestões automáticas

| Entrega | Descrição |
|---------|-----------|
| Base de regras NCM → CST | Tabela interna mapeando NCMs para CSTs que geram crédito |
| Sugestão automática de CST | Sistema sugere o CST correto com base no NCM |
| Aplicação em lote | "Aplicar CST 50 a todos que têm direito" com um clique |
| Histórico de alterações | Log de o que foi alterado, quando, por quem |
| Resumo de impacto | Valor total de crédito recuperado após alterações |

---

## Fase 3 — Escala (Entrega #3)

> **Objetivo:** Processo replicável para toda a equipe

| Entrega | Descrição |
|---------|-----------|
| Multi-usuário | Login, permissões, auditoria |
| Gestão de clientes | Cadastro de clientes, histórico de arquivos processados |
| Dashboard | Métricas: arquivos processados, créditos recuperados, tempo economizado |
| Templates de regras | Regras pré-configuradas por setor/segmento do cliente |
| Documentação e treinamento | Guia de uso para novos consultores |
