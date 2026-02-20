# 📐 Escopo — Automação SPED PIS/COFINS

## O Que Está Incluso (MVP)

### Requisitos Funcionais

1. **Upload de arquivo TXT** do SPED EFD-Contribuições
2. **Parser do arquivo SPED** — extrair registros:
   - `0200` — Cadastro de Itens (Código do Produto, NCM)
   - `C170` — Itens do Documento (CST PIS, CST COFINS, Base de Cálculo, Alíquota, Valor)
   - `C191` — Detalhamento PIS consolidado (alternativa ao C170)
   - `C195` — Detalhamento COFINS consolidado (alternativa ao C170)
3. **Exibição em tabela** com colunas:
   - Código do Produto
   - Descrição do Produto
   - NCM
   - CST PIS (editável)
   - CST COFINS (editável)
4. **Edição manual** dos CSTs pelo usuário
5. **Exportação em TXT** mantendo a estrutura completa do arquivo SPED original
6. **Recálculo automático** dos valores de PIS e COFINS ao alterar CSTs:
   - Base de Cálculo = Valor do Item − Desconto
   - Valor PIS = Base × 1,65%
   - Valor COFINS = Base × 7,6%

### Requisitos Não Funcionais

- Interface web simples e funcional
- Processamento local (sem envio de dados fiscais para servidores externos)
- Suporte a arquivos de qualquer tamanho razoável (até 50MB)
- Preservação exata da estrutura e formatação do SPED

---

## O Que **NÃO** Está Incluso (MVP)

| Item Excluído | Justificativa |
|--------------|---------------|
| Consulta automática ao e-Auditoria | Complexidade alta, pode ser Fase 2 |
| Sugestão automática de CST por NCM | Requer base de regras fiscais — Fase 2 |
| Validação completa do SPED (como o PVA) | Fora do escopo — o PVA já faz isso |
| Multi-usuário / autenticação | MVP — single user |
| Histórico de alterações | Fase 2 |
| Integração com ERP | Fora do escopo |
| Suporte a outros blocos além de C | Fora do escopo |

---

## Critérios de Aceite

| # | Critério | Validação |
|---|---------|-----------|
| 1 | Upload de TXT funciona com arquivo SPED real | Upload + parse sem erros |
| 2 | Tabela exibe todos os produtos com NCM e CSTs | Comparar com planilha manual do Wendell |
| 3 | Edição de CST é salva corretamente | Alterar CST → verificar no TXT de saída |
| 4 | TXT exportado é aceito pelo PVA sem erros | Importar no PVA e validar |
| 5 | Valores de PIS/COFINS são recalculados corretamente | Comparar com cálculo manual |
| 6 | Estrutura do arquivo original é preservada | Diff entre original e exportado — apenas campos CST devem diferir |
