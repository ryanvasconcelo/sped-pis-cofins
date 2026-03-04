# Escopo Geral — Rayo Hub Fiscal

## In-Scope (O que o sistema FAZ)
- Parse robusto 100% client-side de arquivos .TXT do SPED EFD-Contribuições e SPED Fiscal (ICMS/IPI).
- Extração precisa de registros 0200, C170, C191, C195.
- Renderização virtualizada de milhares de linhas para auditoria de NCM e CST.
- Recálculo exato on-the-fly de Base de Cálculo, Valor PIS (1,65%) e Valor COFINS (7,6%).
- Integração local com automação RPA em Puppeteer para busca automatizada de regras por NCM direto na conta premium do e-Auditoria do usuário.
- Exportação idêntica à estrutura (round-trip fidelity) original do arquivo para importação segura no PVA.

## Out-of-Scope (O que o sistema NÃO FAZ)
- Upload para cloud, banco de dados persistente em nuvem de dados sensíveis ou informações do SPED dos clientes.
- Validação estrutural de todos os outros blocos do SPED que não competem a PIS/COFINS/ICMS da substituição e crédito.
- Sugestão 100% autônoma aprovada sem interveniência de um analista fiscal revisor humano (Human in the loop obrigatório).

## Backlog Futuro (Para próximas versões)
- Dashboard gerencial de volumetria de crédito recuperado por cliente.
- Mecanismo de predição via IA local ou LLM para justificar embasamentos tributários avançados.
- Integração nativa com sistema de folha ERP da Fortes para automações de RH cruzadas.
