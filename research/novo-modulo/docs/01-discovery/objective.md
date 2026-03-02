# Objetivo do Projeto: Auditor ICMS

**A Dor (Problema):**
A equipe perde horas (às vezes até 2 horas por empresa) auditando manualmente planilhas de movimentação fiscal (entradas) com milhares de linhas para identificar divergências de classificação (NCM, CST, CFOP, Base de Cálculo) antes do envio ao validador (PVA), correndo o risco alto de falha humana ("não ver" um CST incorreto validando NCMs iguais), o que pode comprometer créditos tributários ou gerar pesadas autuações fiscais futuras.

**O Remédio (A Solução):**
Um Automação (Robô) inteligente que cruza automaticamente os dados do relatório mensal de entradas do cliente (Alterdata) com uma base auditada e confiável de referência (NCMs x CSTs x CFOPs gerada via e-Auditoria), listando rapidamente apenas as linhas com as divergências mapeadas.

**O Impacto (Resultado Esperado):**
Reduzir o tempo de análise tributária de horas para instantes e aumentar a precisão de detecção, poupando a equipe de olhar o que "está certo" (feijão com arroz) para focar apenas nas anomalias tributárias que demandam intervenção humana.

**A Bússola O que este projeto NÃO É:**
Não é um integrador que envia arquivos para a SEFAZ ou que vai alterar o banco de dados do cliente diretamente. É apenas uma ferramenta de auditoria offline focada prioritariamente na frente de "Entradas" (MVP).
