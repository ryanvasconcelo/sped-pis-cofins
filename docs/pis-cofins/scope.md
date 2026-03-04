# Escopo — Módulo: Auditor PIS/COFINS

## In-Scope
- Leitura estruturada rápida client-side dos blocos 0200, C170, C191, C195 de arquivos SPED.
- Edição tabular (interface) rápida em lotes e individual dos CSTs com cálculo automático de Base de Imposto, 1.65% (PIS) e 7.6% (COFINS).
- Inteconectividade ao scraper RPA (e-Auditoria) para resolução assíncrona dos status tributários NCM em lote.
- Geração determinística e de altíssima fidelidade ("round-trip") de arquivos `.txt`.

## Out-of-Scope
- Sugerir alíquotas além do Lucro Real (Regime Não-Cumulativo) para PIS e COFINS no atual motor Padrão.
- Modificar o cabeçalho original (Bloco 0000) e os delimitadores do SPED importado.

## Backlog Futuro
- Otimização do processamento via Web Workers se os arquivos superarem a latência suportada em tela inicial.
- Bulk-update (atualização em massa inteligente) direto nos CSTs da tabela cruzada do RPA.
