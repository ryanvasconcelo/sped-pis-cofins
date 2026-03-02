# 🔥 SUPRA BRIEFING: PROJETO RAYO (HUB FISCAL) 🔥
**Módulo Atual:** Auditor ICMS
**Versão Atual da Arquitetura:** v1.0 (MVP Finalizado e Homologado)
**Próxima Fase:** Automação Web (Puppeteer) + Deploy

---

## 1. O QUE CONSTRUÍMOS (ESTADO ATUAL)
Nós construímos o núcleo duro de um **Auditor Fiscal Autônomo** para cruzamento de dados de notas fiscais de entrada. O sistema processa o "Livrão" (planilha exportada do ERP Alterdata) e bate de frente com a base de regras legislativas do e-Auditoria.

- **Stack Atual (Rayo Hub):** React + Vite (Frontend "Client-Side"), utilizando a lib `xlsx` do npm para processar milhares de linhas num File Drop local sem depender de transação via servidor. Testes com `vitest`.
- **O Resultado do Motor:** Uma tela de `Dashbpoard Virtualizado` que exibe a diferença matemática e tributária linha por linha, separando erros em _Gravidade Crítica (Vermelhos)_ e _Exceções de Contexto (Amarelos)_.
- **Writer:** Além de apontar na tela, o sistema clona a base Original, auto-corrige cirurgicamente os dados defeituosos (preservando dígitos de origem da NF) e cospe um Excel (`Livrão_Auditado_Rayo.xlsx`) novo e limpo para o analista reenviar ao governo (PVA).

---

## 2. A ESTRATÉGIA ARQUITETURAL (O Pulo do Gato 🐈)
Na nossa revisão arquitetural com a equipe de Dev, decidimos por **NÃO transformar o Rayo num Dicionário Legislativo Estático**. 
A equipe júnior queria baixar tabelas NCM/CFOP da Receita em `.csv`. Nós vetamos isso.
A nossa arquitetura orbita na terceirização inteligente da complexidade legislativa ("Data Scraping" do portal e-Auditoria). O e-Auditoria já faz o trabalho divino de monitorar portarias da SEFAZ, CONFAZ, Zona Franca do AM, Regimes Fiscais, etc. 

**O Processo:**
1. O robô extrai apenas os `[NCMs]` únicos do Livrão do cliente.
2. O robô fantasma manda essa lista de NCMs pro **e-Auditoria (via Puppeteer)** declarando o UF e Regime do cliente.
3. O e-Auditoria cospe a Planilha de Regras infalível daquele exato momento temporal.
4. O Rayo pega essa Planilha de Regras e roda a **Força Bruta do Algoritmo** para julgar os arquivos do ERP do usuário.

---

## 3. O CORE DO MOTOR — A INTELIGÊNCIA BIZARRA DO CÓDIGO 🧠
A maior vitória do projeto até aqui foi converter a intuição visual descrita pelo analista em uma `Lógica de Análise Combinatória Estrita` (visível em `icms-auditor.js`):

**A. Análise Combinatória de CST (Não existe apenas um CST Certo):**
- O 1º dígito do CST é a Origem (Nacional/Importado). *O Motor ignora e foca apenas na **raiz** (2 últimos dígitos).*
- Diferenciar Comércio VS Indústria (lido automaticamente da Planilha de Regras).
- **Se Comércio:** 00 e 20 representam a mesma tribo ("Tributados"). Se a regra manda 00 e vem 20, ou manda 00 e vem 120, o motor **não dá erro**, dá alerta amarelo de variação amigável.
- **Se Indústria:** 00, 10, 20, 30, e 70 participam do mesmo bolo combinatório.

**B. A Exceção Humanizada (Uso e Consumo):**
- O motor detecta os **CFOPs 1556 (Uso/Consumo)** e **1908 (Comodato)**. Se o cruzamento de CST e ICMS Base explodirem um erro Vermelho porque a nota indica ser de outro regime, o motor abaixa as armas e muda para "Alerta Amarelo Excepcional". Ele entende que essas transações não são revenda de faturamento e só precisam de um "ok" do humano.
- *NOTA PRO EXCEL WRITER:* O motor se recusa a auto-corrigir silenciosamente no `.xlsx` as linhas de exceção (Uso/Consumo). Elas devem ser manuseadas pelo humano, ele corrige apenas os faturamentos de revenda brutos.

**C. Matemática Base de Cálculo Perfeita:**
- Regra de ST (CST 60) exige Forçar ICMS Base para R$0,00 independentemente do Alterdata.
- A Base normal é: `Valor Item - Desconto + Frete + Despesas + Seguro (se houver)`.
- Se a Planilha do e-Auditoria ditar Redução da Base de Cálculo (Ex: 33,33%), a fração matemática é aplicada corretamente no código. Tolera-se variação de arredondamento cego de `$0,05`.

---

## 4. PRÓXIMOS PASSOS (O DESAFIO QUE VOCÊ PEGARÁ AGORA) 🚀
Toda a auditoria, interface e reescrita de Excel já nasceram. O seu trabalho nessa nova sessão será focado exclusivamente em **INTEGRAÇÃO E AUTOMAÇÃO WEB (Microserviços)**.

### Missão 1: O Robô Fantasma de ICMS (Extensão do Backend/Orquestrador)
Hoje, na tela do Rayo Hub, o usuário arrasta manualmente duas planilhas: O Alterdata e a Regra do e-Auditoria.
**A automação MÁXIMA deve ser:**
1. O usuário arrasta apenas o Livrão Alterdata.
2. O sistema extrai os NCMs únicos e tira o CNPJ da memória da nota.
3. Faz uma requisição à API Pública da Receita Federal (ex: ReceitaWS/BrasilAPI) para descobrir **O Estado (UF)** e o **Regime Tributário/Atividade Principal** do cliente real.
4. Aciona um script em **Puppeteer** silencioso que envia esses dados e o `.txt` de NCMs pro portal e-Auditoria, faz o login corporativo da Projecont, preenche as caixinhas simulando clique humano, baixa a Planilha de Regras `.xlsx` por trás dor panos e devolve para o front-end injetar no Rayo Hub.

### Missão 2: Estender a Automação e-Auditoria para o PIS/COFINS
A Projecont também recupera créditos de PIS/Cofins com o módulo antigo. Você terá que reaproveitar o Scraper do Puppeteer recém-criado em ICMS para pesquisar na tela do e-Auditoria a aba de Contribuições PIS/COFINS, devolvendo as Alíquotas baseadas também numa base recém-raspada pra eles não recodificarem leis do congresso manualmente!

### Missão 3: Deploy V1
Remover a dependência do `localhost`. Preparar pra enviar tudo num Container/Vercel pra agência da Projecont.

*"Boa sorte, parceiro de IA. Siga firme focando exclusivamente no Puppeteer e na integração de APIs. A parte matemática eu já tirei do chão pra você!"* — IA Anterior.
