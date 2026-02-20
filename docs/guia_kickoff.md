# 🎤 Guia de Kickoff Estruturado

> Template replicável para reuniões de kickoff com stakeholders.
> Baseado na experiência real do projeto Automação SPED PIS/COFINS.

---

## Como Usar Este Guia

1. **Antes da reunião**: Leia as perguntas e prepare-se sobre o contexto do cliente
2. **Durante a reunião**: Siga as seções na ordem. Não pule. Anote tudo.
3. **Depois da reunião**: Preencha os campos que ficaram em aberto e valide com o stakeholder

---

## Seção 1 — Contexto e Objetivo

> Entender POR QUE existe esse projeto.

| # | Pergunta | Resposta |
|---|---------|----------|
| 1.1 | Qual é o problema que estamos resolvendo? | |
| 1.2 | Quem sofre com esse problema? (cargo, equipe, cliente final?) | |
| 1.3 | Como esse problema é resolvido hoje? (processo manual atual) | |
| 1.4 | Quanto tempo leva o processo atual? | |
| 1.5 | Qual é o custo/impacto de NÃO resolver esse problema? | |
| 1.6 | Qual é o resultado que você espera quando o projeto estiver entregue? | |
| 1.7 | Se o projeto estivesse pronto hoje, como você descreveria o que vê na tela? | |

> [!TIP]
> A pergunta 1.7 é a mais reveladora. Peça para o stakeholder **descrever a tela** como se estivesse usando o produto finalizado. Isso elimina ambiguidade.

---

## Seção 2 — Fluxo do Processo

> Mapear o processo COMPLETO, do início ao fim.

| # | Pergunta | Resposta |
|---|---------|----------|
| 2.1 | Qual é o ponto de partida? (De onde vêm os dados? Qual arquivo? Qual sistema?) | |
| 2.2 | Me mostra o processo passo a passo? (peça compartilhamento de tela) | |
| 2.3 | Em cada passo: o que você faz? Que ferramenta usa? Quanto tempo leva? | |
| 2.4 | Onde estão os gargalos? O que mais trava ou dá erro? | |
| 2.5 | Existe alguma variação no processo? (ex: muda por cliente, por tipo de arquivo?) | |
| 2.6 | Qual é o output final? (formato, pra onde vai, quem recebe?) | |
| 2.7 | Depois do output, existe algum passo de validação ou conferência? | |

> [!IMPORTANT]
> Sempre peça **compartilhamento de tela**. Assistir o stakeholder executar o processo é 10x mais valioso do que ouvir a descrição. Grave a reunião.

---

## Seção 3 — Regras de Negócio

> Identificar a lógica que o sistema precisa implementar.

| # | Pergunta | Resposta |
|---|---------|----------|
| 3.1 | Quais são os termos técnicos do domínio? (construa um glossário) | |
| 3.2 | Quais são as regras que você aplica para tomar decisões? | |
| 3.3 | Essa regra é sempre a mesma ou muda por cenário? Qual cenário? | |
| 3.4 | De onde vem a "fonte de verdade"? (tabela, site, legislação, experiência?) | |
| 3.5 | Existem exceções? Quando a regra NÃO se aplica? | |
| 3.6 | Quais são os códigos/valores mais comuns? E os mais raros? | |
| 3.7 | Qual é a consequência de aplicar uma regra errada? (risco do erro) | |

> [!CAUTION]
> Se a resposta for "depende", insista: **"depende de quê?"**. Toda ambiguidade vira bug no futuro.

---

## Seção 4 — Dados e Formatos

> Entender a estrutura dos dados que o sistema vai processar.

| # | Pergunta | Resposta |
|---|---------|----------|
| 4.1 | Qual é o formato do arquivo de entrada? (TXT, CSV, XLSX, JSON?) | |
| 4.2 | A estrutura é fixa ou varia? | |
| 4.3 | Qual o tamanho médio de um arquivo? E o maior? | |
| 4.4 | Existem problemas de formatação conhecidos? (encodings, zeros, pontos, vírgulas) | |
| 4.5 | O que precisa ser preservado intacto na saída? | |
| 4.6 | Qual é o formato de saída esperado? | |
| 4.7 | Existe alguma ferramenta/sistema que valida a saída? | |
| 4.8 | Você pode me enviar 2-3 arquivos de exemplo reais? | |

> [!TIP]
> Obter arquivos REAIS de exemplo é **obrigatório** antes de começar a implementar. Não trabalhe com dados fictícios.

---

## Seção 5 — Escopo e Limites

> Definir o que entra e o que NÃO entra no projeto.

| # | Pergunta | Resposta |
|---|---------|----------|
| 5.1 | Se pudesse escolher só UMA funcionalidade, qual seria? (define o MVP) | |
| 5.2 | O que podemos deixar pra depois? (Fase 2) | |
| 5.3 | Alguma funcionalidade que parece obrigatória mas pode ser feita manualmente por ora? | |
| 5.4 | Existe algum sistema externo que precisa integrar? | |
| 5.5 | Quantos usuários vão usar o sistema? (1? 5? 50?) | |
| 5.6 | Precisa de login/autenticação? | |
| 5.7 | Precisa funcionar offline? | |

---

## Seção 6 — Stakeholders e Comunicação

> Quem está envolvido e como nos comunicamos.

| # | Pergunta | Resposta |
|---|---------|----------|
| 6.1 | Quem é o dono do projeto? (quem aprova entregas) | |
| 6.2 | Quem é o usuário final? (quem vai usar no dia a dia) | |
| 6.3 | Quem pode tirar dúvidas técnicas/de negócio durante o desenvolvimento? | |
| 6.4 | Qual é o canal de comunicação preferido? (WhatsApp, email, Teams?) | |
| 6.5 | Com que frequência fazemos alinhamento? (diário, semanal?) | |

---

## Seção 7 — Prazo e Prioridade

> Alinhar expectativas de tempo.

| # | Pergunta | Resposta |
|---|---------|----------|
| 7.1 | Existe uma data limite? Qual? | |
| 7.2 | Existe um evento externo que depende dessa entrega? (auditoria, deadline fiscal?) | |
| 7.3 | Prefere uma entrega completa no final ou parciais ao longo do caminho? | |
| 7.4 | Qual é a prioridade desse projeto comparado a outros da equipe? | |

---

## Seção 8 — Riscos e Dependências

> Identificar o que pode dar errado.

| # | Pergunta | Resposta |
|---|---------|----------|
| 8.1 | O que pode atrasar esse projeto? | |
| 8.2 | Existe algum acesso/login que precisamos e ainda não temos? | |
| 8.3 | Algum dado sensível que requer cuidado especial? (dados fiscais, CPF, CNPJ?) | |
| 8.4 | Existe alguém que precisamos consultar e pode não estar disponível? | |
| 8.5 | Se o sistema der um resultado errado, qual é o impacto? | |

---

## Seção 9 — Checkpoint Final

> Validar que entendemos tudo corretamente.

| # | Ação | ✅ |
|---|------|-----|
| 9.1 | Repita o fluxo de volta pro stakeholder: "Então o processo é..." | |
| 9.2 | Confirme o escopo: "Então no MVP a gente vai entregar X, Y e Z. O W fica pra depois." | |
| 9.3 | Confirme o output: "A saída do sistema vai ser um arquivo/tela que mostra..." | |
| 9.4 | Confirme os próximos passos: "Eu vou precisar de A, B e C pra começar." | |
| 9.5 | Agende o próximo alinhamento | |

---

## Após o Kickoff — Checklist de Entregáveis

- [ ] Transcrição da reunião (gravação + texto)
- [ ] Briefing estruturado (briefing_kickoff.md)
- [ ] Documentação: Vision, Escopo, Riscos, Roadmap
- [ ] Arquivos de exemplo coletados
- [ ] Acessos e recursos necessários documentados
- [ ] Próximo alinhamento agendado

> [!NOTE]
> Este guia deve ser atualizado com novas perguntas conforme a equipe ganhar experiência em kickoffs. Ele é um documento vivo.
