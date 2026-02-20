# Rayo — Automação SPED PIS/COFINS

Um sistema web local e de alta performance construído com **Vite + React** para auditar, agrupar e alterar em lote alíquotas e CSTs de arquivos SPED (EFD-Contribuições). 

Rayo foi projetado para contadores e analistas fiscais que precisam processar milhares de linhas de PIS/COFINS no SPED sem depender de integrações complexas de ERP, garantindo que os dados da sua empresa **nunca saiam da sua máquina local**.

![Rayo Interface](rayo/public/logo.png)

## ⚡ Principais Funcionalidades

- **Agrupamento Inteligente por NCM:** O motor reduz um bloco C170/C191/C195 de 15.000 linhas para apenas 60-80 grupos NCM únicos, organizando o caos do arquivo original.
- **Edição em Lote (Bulk Edit):** Alterou o CST ou Alíquota no grupo do NCM? O sistema varre e atualiza dezenas de milhares de registros filhos dependentes em milissegundos.
- **Módulo de Automação "De-Para":** Um painel onde você cadastra regras condicionais (`NCM` + `Cód. Produto` + `CST Atual` ➡️ `Novo CST`). O sistema então reclassifica tudo automaticamente.
- **Renderização Virtualizada:** Construído sobre `react-virtuoso`, o DOM renderiza apenas os cards NCM que estão na tela, garantindo zero lag e 60 FPS no scroll, mesmo com arquivos contendo 80.000 itens.
- **Extrator de NCMs:** Exporte a relação limpa de NCMs encontrados na escrituração com um clique.
- **Privacy First (100% Client-Side):** Todo o processamento e cálculos ocorrem no seu próprio navegador usando a File API. Não há APIs externas nem backends. Sem riscos de vazamento de dados fiscais (LGPD).

## 📊 Arquitetura e Engenharia

O projeto é dividido em uma interface React minimalista e um "Core" de processamento de texto SPED puramente funcional (Vanilla JS).

```text
/rayo/src/core/
 ├── sped-parser.js    # Faz parse de TXTs EFD e extrai blocos 0200, C170, C191, C195
 ├── ncm-grouper.js    # Agrupa entradas por NCM (resolve ausência de NCM no C191 usando C190)
 ├── calculator.js     # Regras de negócio de base de cálculo do PIS/COFINS
 └── sped-writer.js    # Motor de replace em buffer para gerar o novo .TXT idêntico ao validador
```

A stack escolhida (**Vite + React**) foi otimizada com `--force` no esbuild para pré-empacotar dependências, garantindo inicializações híbridas CJS/ESM (`react-virtuoso`) consistentes via browser.

## 🚀 Como Rodar Localmente

Certifique-se de possuir o [Node.js](https://nodejs.org/) (versão 18+ recomendada) instalado.

1. Clone o repositório ou baixe a pasta.
2. Navegue até o diretório do frontend:
```bash
cd rayo
```
3. Instale as dependências:
```bash
npm install
```
4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo abrirá no seu navegador, por padrão na porta `http://localhost:5173`.

## 🛠 Como usar o Módulo De-Para

1. Arraste e solte o seu arquivo `.txt` do SPED Contribuições.
2. Clique no ícone de Raio **"Regras De-Para"** na barra de ações (Action Bar).
3. Clique em **Adicionar Regra**.
4. Defina os critérios de busca (ex: NCM "15079011" e CST Atual "73"). 
*(Nota: NCM e Código do Produto são opcionais. Se vazios, atuam como curinga).*
5. Preencha o campo obrigatório **Novo CST** com o imposto desejado (ex: "50" para crédito na alíquota básica).
6. Clique em **Salvar e Aplicar**. O aplicativo varrerá todo o arquivo e preencherá em verde os NCMs/produtos correspondentes.
7. Quando terminar, basta clicar em **Exportar TXT Revisado**.

---
*Construído com obsessão por performance e design.*
