# Kickoff: Auditor ICMS

**Sponsor:** Marcelo
**Stakeholders / Usuários Reais:** Alisson, Ênio (Analistas Fiscais / Auditores)

## 🎯 O Objetivo (Elevator Pitch)
Um robô inteligente que cruza automaticamente milhares de dados do relatório mensal de entradas do cliente (Alterdata) com uma base auditada de referência (gerada via e-Auditoria), listando rapidamente apenas as linhas com as divergências de tributação (NCM, CST, CFOP e Base de Cálculo) mapeadas.

## ⚠️ O Que Decidimos NÃO Fazer (Limites Restritivos do MVP)
1. Não vamos auditar "Saídas" (Outputs). O foco total agora são "Entradas".
2. Não vamos fazer o robô alterar dados diretamente no sistema Alterdata.
3. Não conectaremos o robô em nuvem. A solução processará os planilhões sensíveis das empresas localmente (Offline / Client-Side) e sem APIs dependentes de terceiros além das bases providenciadas pelo usuário.
4. Não criaremos um ERP ou Sistema Contábil do zero, nem enviaremos arquivos diretamente ao Validador Governamental (PVA). O robô é um filtro antes do PVA.

## 🛠️ Entradas e Regras Principais (Happy Path)
- **Input:** Usuário fornece a) Planilha Anual/Mensal do Cliente com código Alterdata e b) A "Base Auditada" (Library) gerada pela IA do e-Auditoria baseada em NCMs.
- **Processamento:** O robô compara o NCM do Alterdata e descobre o CST e CFOP ideais. Em seguida, verifica se a combinação informada na nota do cliente faz sentido com a combinação auditada.
- **Exceções Básicas Tratadas:** Casos de substituição tributária, operações especiais (uso e consumo, comodato, transferência). Onde o robô não tiver total certeza do "erro óbvio", apontará como Alerta Amarelo para revisão humana.
- **Validação Matemática:** Recálculo da Base de ICMS (`Valor do item - Descontos + Despesas Acessórias + Frete + Seguro`).
- **Interface e Filtros (Dashboard):** Apresentação virtualizada de alta performance com paginação inteligente. Haverá filtros para cada modalidade da auditoria, com opção de exibir "Todos". O filtro padrão ao abrir o sistema será focado estritamente em **Erros e Alertas** para poupar o tempo do usuário.
## 📅 Timeline Macro e Urgência
- **Fase 02 (Escopo Otimizado):** Hoje
- **Fase 03 (MVP - Entregável Funcional):** Terça/Quarta (Conforme urgency do Stakeholder)
- O sponsor precisa que alguma versão funcional (protótipo da entrada) já esteja rodando no início da próxima semana.

## ✅ Próximos Passos
1. Validar e aprovar este Kickoff (Objetivo e Escopo).
2. Desenhar a Arquitetura Final (Fase 4).
3. Desenvolver o script validador e validar um lote inicial de teste (Fase 5).
