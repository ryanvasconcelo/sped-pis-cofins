# 🎯 Vision — Automação SPED PIS/COFINS

## Problema

Empresas no regime de **Lucro Real** frequentemente perdem créditos tributários de PIS e COFINS porque seus ERPs não parametrizam corretamente os **CSTs (Códigos de Situação Tributária)** na escrituração fiscal digital (SPED EFD-Contribuições).

O processo de revisão e correção desses CSTs é feito **manualmente** por consultores fiscais usando combinação de PVA + Excel + e-Auditoria — um processo lento, repetitivo e sujeito a erros.

## Objetivo

Criar uma **aplicação web** que automatize o fluxo de revisão de CSTs de PIS e COFINS em arquivos SPED, permitindo ao consultor fiscal:

1. Importar o arquivo TXT do SPED
2. Visualizar os produtos com seus NCMs e CSTs atuais
3. Alterar os CSTs para os códigos que geram crédito
4. Exportar o arquivo TXT corrigido para validação no PVA

## Resultado Esperado

- **Redução de tempo**: De horas para minutos por arquivo
- **Redução de erros**: Eliminação de problemas de formatação (pontos, zeros à esquerda)
- **Padronização**: Processo replicável para qualquer cliente no Lucro Real
- **Escalabilidade**: Múltiplos consultores usando o mesmo sistema

## Métrica de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Tempo por arquivo | 2-4 horas | < 10 minutos |
| Erros de formatação | Frequentes | Zero |
| Rejeição pelo PVA | Ocasional | 0% |
| Consultores capacitados | 1 (Wendell) | Toda a equipe |

## Impacto para o Negócio

- **Receita**: Cada revisão gera recuperação de créditos para o cliente (retorno financeiro direto)
- **Eficiência**: Mais clientes atendidos por consultor
- **Diferencial competitivo**: Entrega rápida e padronizada
- **Processo replicável**: Qualquer membro da equipe executa com qualidade
