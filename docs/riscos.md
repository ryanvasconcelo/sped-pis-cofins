# ⚠️ Riscos — Automação SPED PIS/COFINS

## Matriz de Riscos

| # | Risco | Impacto | Probabilidade | Mitigação |
|---|-------|---------|---------------|-----------|
| R1 | Estrutura do TXT SPED variar entre clientes/softwares | 🔴 Alto | 🟡 Média | Testar com múltiplos arquivos de clientes diferentes |
| R2 | Perda de zeros à esquerda em NCMs durante processamento | 🟡 Médio | 🔴 Alta | Tratar TODOS os campos como string — nunca converter para número |
| R3 | CSTs alterados incorretamente causam autuação fiscal | 🔴 Crítico | 🟢 Baixa | Validação humana obrigatória + aviso na interface |
| R4 | PVA rejeitar o TXT gerado pelo sistema | 🔴 Alto | 🟡 Média | Testes exaustivos com o validador; preservar estrutura byte a byte |
| R5 | Arquivo SPED muito grande travar a aplicação | 🟡 Médio | 🟡 Média | Processamento por streaming; rão carregar tudo na memória |
| R6 | e-Auditoria mudar formato de consulta | 🟡 Médio | 🟢 Baixa | MVP não depende do e-Auditoria (consulta manual) |
| R7 | Encoding do arquivo TXT incorreto (acentos, caracteres especiais) | 🟡 Médio | 🟡 Média | Detectar encoding automaticamente; suportar UTF-8 e ISO-8859-1 |
| R8 | Campos delimitados por pipe `|` contendo pipe nos dados | 🟢 Baixo | 🟢 Baixa | SPED tem formato fixo — improvável, mas validar |

## Ações Preventivas Imediatas

1. **Obter pelo menos 3 arquivos TXT reais** de clientes diferentes para testes
2. **Documentar a especificação oficial** do layout SPED EFD-Contribuições
3. **Nunca converter campos numéricos/NCM** para tipos numéricos — sempre string
4. **Implementar teste de ida-e-volta (round-trip)**: importar → exportar sem modificação → diff deve ser zero
