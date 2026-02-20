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

1. Abra o **Prompt de Comando (CMD)** como Administrador.
2. Navegue até a pasta `rayo` dentro do projeto onde você baixou/extraiu os arquivos:
    ```cmd
    cd C:\caminho\para\a\pasta\sped-pis-cofins\rayo
    ```
3. Instale as dependências executando:
    ```cmd
    npm install
    ```
4. Crie a versão otimizada para produção (Build):
    ```cmd
    npm run build
    ```
    *Isso criará uma pasta chamada `dist` com os arquivos finais minificados e super rápidos.*

5. Instale o pacote `serve` globalmente (ele será nosso servidor web):
    ```cmd
    npm install -g serve
    ```

---

## 3. Rodando o Servidor na Rede Local

Ainda no Prompt de Comando, dentro da pasta `rayo`, inicie o servidor na porta `80` (porta padrão de sites, para que os usuários não precisem digitar a porta na URL):

```cmd
serve -s dist -l 80
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

1. Abra o **Bloco de Notas** no Windows.
2. Cole o seguinte código (ajuste o caminho de acordo com onde você salvou a pasta):
    ```bat
    @echo off
    echo Iniciando Servidor Rayo...
    cd C:\Caminho\Completo\Para\sped-pis-cofins\rayo
    serve -s dist -l 80
    ```
3. Salve o arquivo com o nome `iniciar-rayo.bat` (não salve como .txt).
4. Pressione `Windows + R`, digite `shell:startup` e dê Enter. A pasta Inicializar abrirá.
5. Coloque o arquivo `iniciar-rayo.bat` dentro dessa pasta. 
Pronto! Sempre que o Windows ligar, ele já subirá o servidor para toda a rede automaticamente.

---

### Solução de Problemas Comuns
* **A rede não acha o site / Fica carregando infinitamente:** O Firewall do Windows está bloqueando a porta 80. Vá no Painel de Controle > Firewall do Windows Defender > Configurações Avançadas > Regras de Entrada > Nova Regra > Porta > TCP, Específica (80) > Permitir a conexão > Nomeie como "Porta 80 Rayo".
* **O CMD diz "serve não é reconhecido":** Feche todos os CMDs, abra de novo como Administrador e rode `npm install -g serve` aguardando concluir antes de fechar.
* **O IP mudou:** Se a internet reiniciar, roteadores podem trocar o IP do Windows. É recomendado ir nas configurações de rede do Windows e colocar o IP como *Estático* ou fixá-lo no roteador.
