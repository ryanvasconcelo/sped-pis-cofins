# Objetivo Geral — Rayo Hub Fiscal

## A Dor
Analistas fiscais gastam horas corrigindo manualmente códigos CST de PIS, COFINS e ICMS em arquivos SPED gigantes (TXTs), cruzando dados em Excel via PROCV com consultas NCM no portal e-Auditoria. O processo é letárgico, repetitivo, e tem alto risco de corrupção da formatação original exigida pelo validador PVA da Receita Federal.

## A Solução
Rayo é um hub fiscal web local e de alta performance. Ele oferece uma interface otimizada para carregar o arquivo SPED diretamente no navegador (privacidade client-side total) onde o analista pode auditar e alterar CSTs com os devidos recálculos de base e impostos. Adicionalmente, possui um motor RPA (Robotic Process Automation) integrado (o Rayo Server) para consultar regras tributárias automaticamente no e-Auditoria, removendo a necessidade de pesquisa manual externa.

## O Que Não É
Não é um ERP. Não emite notas fiscais, não substitui o PVA da Receita Federal para validação esquemática profunda, e não armazena arquivos de clientes na nuvem (opera de forma estritamente local/estateless para obedecer à LGPD).
