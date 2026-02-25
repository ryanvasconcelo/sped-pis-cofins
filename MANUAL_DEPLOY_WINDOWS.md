# Guia de Deploy - Rayo v3.0 (Windows / Rede Local)

Este guia ensina como fazer o deploy da aplicação Rayo v3.0 em uma máquina Windows para que qualquer computador na mesma rede local (Wi-Fi ou Cabo) possa acessá-la via navegador, **sem necessidade de autenticação**.

## 1. Preparando o Servidor (Máquina Windows Principal)

### 1.1 Instalar o Node.js
1. Acesse o site oficial: [https://nodejs.org/](https://nodejs.org/)
2. Baixe a versão **LTS (Recommended for Most Users)**.
3. Instale normalmente (Next > Next > Install). Deixe as opções padrão ativas.

### 1.2 Baixar a Aplicação
Você pode baixar o código de duas formas:
- **Via Git Clone (Recomendado):** Abra o Prompt de Comando (CMD) e digite:
  ```cmd
  git clone https://github.com/ryanvasconcelo/sped-pis-cofins.git
  ```
- **Via Arquivo ZIP:** Acesse o repositório no GitHub, clique no botão verde **"Code"** e escolha **"Download ZIP"**. Extraia a pasta em um local de fácil acesso (ex: `C:\Rayo`).

---

## 2. Configurando a Aplicação

### 2.1 Backend (Servidor de Inteligência)
1. Navegue até a pasta `rayo-server`:
    ```cmd
    cd C:\caminho\para\a\pasta\sped-pis-cofins\rayo-server
    ```
2. Instale as dependências:
    ```cmd
    npm install
    ```

### 2.2 Frontend (Interface Visual)
1. Navegue até a pasta `rayo`:
    ```cmd
    cd C:\caminho\para\a\pasta\sped-pis-cofins\rayo
    ```
2. Instale as dependências:
    ```cmd
    npm install
    ```
3. Crie a versão otimizada para produção (Build):
    ```cmd
    npm run build
    ```
    *Isso criará uma pasta chamada `dist`.*

4. Instale o pacote `serve` globalmente:
    ```cmd
    npm install -g serve
    ```

---

## 3. Rodando o Servidor na Rede Local

Para funcionar, você precisará rodar **dois serviços** simultaneamente: o Servidor de Inteligência (Porta 3001) e o Site (Porta 80).

1. Abra um CMD e inicie o **Site**:
   ```cmd
   cd C:\caminho\para\rayo
   serve -s dist -l 80
   ```

2. Abra **outro** CMD e inicie o **Servidor**:
   ```cmd
   cd C:\caminho\para\rayo-server
   npm start
   ```

Se aparecer uma janela do **Firewall do Windows** perguntando se deseja permitir que o Node.js acesse a rede, marque a caixinha **Redes Privadas** (e Públicas, se tiver dúvida) e clique em **Permitir Acesso**.

### Descobrindo o IP do Servidor
Para que outros computadores acessem, você precisa saber qual é o IP "Local" da máquina servidora.
1. Abra um *novo* CMD.
2. Digite:
    ```cmd
    ipconfig
    ```
3. Procure pela linha **"Endereço IPv4"** (ex: `192.168.1.15`).

### Como os outros acessam?
Qualquer pessoa na mesma rede só precisa abrir o Google Chrome, Edge ou Safari e digitar o IP na barra de endereços:
**http://192.168.1.15**

A aplicação Rayo abrirá automaticamente, sem senhas!

---

## 4. (Opcional) Dica de Ouro: Iniciar Automaticamente com o Windows

Para não precisar abrir o CMD toda vez que o servidor for reiniciado, vamos criar um script de inicialização dupla:

1. Abra o **Bloco de Notas**.
2. Cole o seguinte código (ajuste os caminhos):
    ```bat
    @echo off
    echo Iniciando Ecossistema Rayo (Backend + Frontend)...
    
    :: Inicia o Backend em segundo plano
    start /b "" cmd /c "cd C:\Caminho\rayo-server && npm start"
    
    :: Inicia o Frontend (Site)
    cd C:\Caminho\rayo
    serve -s dist -l 80
    ```
3. Salve como `iniciar-rayo.bat`.
4. Pressione `Windows + R`, digite `shell:startup` e coloque o arquivo lá.

---

### Solução de Problemas Comuns
* **A rede não acha o site / Fica carregando infinitamente:** O Firewall do Windows está bloqueando as portas. Você deve liberar a porta **80** (Site) e a **3001** (Servidor).
    - Vá no Painel de Controle > Firewall do Windows > Configurações Avançadas.
    - Regras de Entrada > Nova Regra > Porta > TCP.
    - Em "Portas locais específicas", digite: `80, 3001`.
    - Permitir a conexão > Nomeie como "Rayo Network Access".
* **O IP mudou:** Se a internet reiniciar, roteadores podem trocar o IP do Windows. É recomendado ir nas configurações de rede do Windows e colocar o IP como *Estático* ou fixá-lo no roteador.
