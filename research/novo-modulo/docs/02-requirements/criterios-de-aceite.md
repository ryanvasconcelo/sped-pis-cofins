# Critérios de Aceite: Auditor ICMS

## Funcionalidade 1: Match Semântico e Estrutural (NCM vs Dados informados)
**Descrição:** O sistema deve comparar os dados declarados na entrada da nota com a base de referência (e-Auditoria) para apontar discrepâncias de tributação.

### Critério 1.1: Validação de CST e CFOP Incorretos
- **Contexto (Dado que):** O usuário sobe uma planilha do sistema (Livrão em `.xlsx` ou `.csv`) contendo um item com NCM "8482.80.00" e CST "000". A base de referência (planilha gerada no e-Auditoria) indica que para este NCM (Comércio), o CST correto deveria ser "060" e o CFOP "1403".
- **Ação (Quando):** O robô processar os arquivos.
- **Resultado Esperado (Então):** O sistema deve gerar um "Erro Crítico" 🔴 (vermelho) apontando a divergência: "CST/CFOP informado diverge da base auditada".
- **Forma de Validação:** Teste unitário passando os campos brutos específicos (a definir) e verificando a saída do motor de regras.

### Critério 1.2: Tratamento de Exceções de Operação (Uso e Consumo / Comodato)
- **Contexto (Dado que):** O usuário sobe um item onde o NCM indica CST "000" para revenda, mas o CFOP informado na nota é de "Uso e Consumo" (ex: 1556) ou "Comodato".
- **Ação (Quando):** O robô iterar sobre a regra da base.
- **Resultado Esperado (Então):** O sistema NÃO deve gerar um erro crítico se a base justificar a mudança pelo contexto. Ele deve gerar um "Alerta" 🟡 (amarelo) informando que a tributação mudou devido à operação atípica e pede validação humana.
- **Forma de Validação:** Injeção manual de um CFOP de uso e consumo nos testes automatizados para verificar a classificação do erro.

## Funcionalidade 2: Auditoria Matemática de Base de Cálculo
**Descrição:** Recálculo do valor de base para garantir que o cliente não calculou imposto sobre valor indevido.

### Critério 2.1: Discrepância na Soma da Base de ICMS
- **Contexto (Dado que):** O item exige Base de ICMS. O sistema de origem do cliente acusa R$ 100,00 de Base de Cálculo. Porém, a soma de `Valor do item (100) - Descontos (10) + Despesas Acessórias (0) + Frete (20) + Seguro (0)` resulta em R$ 110,00.
- **Ação (Quando):** O motor matemático rodar.
- **Resultado Esperado (Então):** O sistema deve disparar alerta por divergência matemática de R$ 10,00 na Base de ICMS.
- **Forma de Validação:** UI/Console Test passando dados adulterados.

## Funcionalidade 3: Visibilidade e Performance (O Dashboard)
**Descrição:** Interface rápida baseada em paginação/virtualização para não travar os navegadores.

### Critério 3.1: Filtro Restrito por Padrão
- **Contexto (Dado que):** O arquivo possui 100.000 linhas processadas. 98.000 estão corretas e 2.000 têm alertas/erros.
- **Ação (Quando):** A interface de resultados renderizar.
- **Resultado Esperado (Então):** A tabela deve exibir IMEDIATAMENTE as 2.000 linhas com divergências, filtrando as linhas "Corretas" (Feijão com arroz) para sumirem da visão principal, economizando tempo. Haverá um botão de filtro explicitando "Mostrar Apenas Erros/Alertas" (Ativo) e "Mostrar Todas" (Inativo).
- **Forma de Validação:** Teste de Renderização na UI (Browser).

---
*Nota do Arquiteto: O mapeamento exato das colunas e formato da planilha (Livrão) será definido assim que obtivermos amostras reais dos arquivos (A base auditada e o Livrão do Alterdata) gerados para este projeto.*
