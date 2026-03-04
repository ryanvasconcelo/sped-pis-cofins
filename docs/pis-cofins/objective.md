# Objetivo — Módulo: Auditor PIS/COFINS

## A Dor
Consultores fiscais precisam analisar manualmente arquivos SPED gigantescos, linha a linha, consultando códigos NCM complexos para validar se o item possui direito a créditos de PIS e COFINS não utilizados. Fazer isso manualmente via Excel é lento, sujeito a corrupção do formato rígido do SPED e não escala.

## A Solução
O **Auditor PIS/COFINS** permite que o usuário faça o upload do seu arquivo SPED EFD-Contribuições no navegador com processamento super rápido. Ele não apenas exibe e agrupa os itens e seus códigos CST em uma tabela hiper-otimizada permitindo a alteração sob os exatos layouts C170/C191/C195, como embarca um motor inteligente invisível (backend RPA Puppeteer) que busca diretamente nos provedores de regras fiscais quais NCMs permitem recuperar crédito, recalculando instantaneamente e gerando o novo arquivo seguro.

## O Que Não É
Não é um autorizador de crédito automático nem um validador oficial substituto ao Validador PVA. O RPA é apenas um copiloto da pesquisa NCM, exigindo sempre que o auditor atue como "human in the loop".
