# PDB Explorer

Aplicação web local para busca e análise de estruturas proteicas do [RCSB PDB](https://www.rcsb.org/).
Permite que usuários não-programadores explorem dados moleculares — da busca inicial até o redocking via [DrugHunter](https://github.com/michelclemer/DrugHunter).

**Stack:** FastAPI · React 18 · TypeScript · Tailwind CSS v4

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Rodar em modo desenvolvimento](#rodar-em-modo-desenvolvimento)
3. [Gerar o instalador Linux (.deb)](#gerar-o-instalador-linux-deb)
4. [Instalar o .deb no Linux](#instalar-o-deb-no-linux)
5. [Gerar o instalador Windows (.exe)](#gerar-o-instalador-windows-exe)
6. [Instalar o .exe no Windows](#instalar-o-exe-no-windows)
7. [Configuração do arquivo .env](#configuração-do-arquivo-env)
8. [Configuração do DrugHunter (redocking)](#configuração-do-drughunter-redocking)
9. [Desinstalar](#desinstalar)
10. [Estrutura do projeto](#estrutura-do-projeto)

---

## Pré-requisitos

### Para rodar em desenvolvimento

| Ferramenta | Versão mínima | Como verificar |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

### Para gerar o instalador Linux (.deb)

```bash
# Obrigatório
sudo apt install fakeroot dpkg-dev

# Para ícone personalizado (opcional)
sudo apt install inkscape imagemagick
```

### Para gerar o instalador Windows (.exe) — executado no Linux

```bash
sudo apt install nsis

# Para ícone personalizado (opcional)
sudo apt install inkscape imagemagick
```

---

## Rodar em modo desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/Letolsilva/PDB-Explorer.git
cd PDB-Explorer

# ── Backend ──────────────────────────────────────────────────────────
cd backend

# Crie e ative o ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Copie e configure o .env
cp .env.example .env
# Edite .env conforme necessário (ver seção "Configuração do .env")

# Inicie o servidor
uvicorn app.main:app --reload --port 8000

# ── Frontend (novo terminal) ──────────────────────────────────────────
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## Gerar o instalador Linux (.deb)

O script `build.sh` compila o frontend, empacota o backend e gera um único arquivo `pdb-explorer.deb` pronto para distribuição.

### Passo a passo

```bash
# 1. Clone o repositório (se ainda não fez)
git clone https://github.com/Letolsilva/PDB-Explorer.git
cd PDB-Explorer

# 2. Instale as dependências de build (necessário apenas uma vez)
sudo apt install fakeroot dpkg-dev nodejs npm

# 3. Execute o script de build
chmod +x build.sh
./build.sh
```

Ao final, o arquivo `pdb-explorer.deb` será gerado na raiz do projeto. O script exibe o caminho e o tamanho:

```
✅ Pronto!
-rw-r--r-- 1 user user 12M jun  4 12:00 pdb-explorer.deb
```

### O que o script faz (resumo)

1. Executa `npm ci && npm run build` no frontend
2. Copia o build gerado para `backend/static/`
3. Monta a estrutura de pacote Debian em `pdb-explorer-pkg/`
4. Inclui um script `iniciar.sh` que:
   - Na primeira execução: cria um virtualenv Python em `~/.local/share/pdb-explorer/.venv` e instala as dependências automaticamente
   - Nas execuções seguintes: apenas inicia o servidor e abre o navegador
5. Registra um atalho no menu GNOME (`Aplicativos → Ciência → PDB Explorer`)
6. Compila o `.deb` com `fakeroot dpkg-deb`

---

## Instalar o .deb no Linux

### Opção 1 — Interface gráfica (Ubuntu/Mint com GNOME)

1. Localize o arquivo `pdb-explorer.deb` no gerenciador de arquivos
2. Dê duplo clique → **Ubuntu Software** abre automaticamente
3. Clique em **Instalar** e informe a senha sudo
4. Após a instalação, procure por **PDB Explorer** no menu de aplicativos

### Opção 2 — Terminal

```bash
sudo dpkg -i pdb-explorer.deb
```

Se houver dependências faltando, execute em seguida:

```bash
sudo apt install -f
```

### Primeira execução após instalação

1. Abra o **PDB Explorer** no menu de aplicativos (ou execute `/opt/pdb-explorer/iniciar.sh`)
2. Na primeira vez, uma janela de progresso aparecerá enquanto o ambiente Python é configurado (~1 minuto)
3. O navegador abrirá automaticamente em **http://localhost:8080**

### Onde ficam os dados do usuário

Todos os dados são isolados por usuário, sem necessidade de permissão de administrador:

| Item | Caminho |
|---|---|
| Banco de dados (SQLite) | `~/.local/share/pdb-explorer/pdb_explorer.db` |
| Arquivos PDB baixados | `~/.local/share/pdb-explorer/pdb_files/` |
| Configurações (.env) | `~/.local/share/pdb-explorer/.env` |
| Logs | `~/.local/share/pdb-explorer/pdb_explorer.log` |
| Virtualenv Python | `~/.local/share/pdb-explorer/.venv/` |

### Dependências do sistema (instaladas automaticamente pelo .deb)

- `python3`
- `python3-venv`

---

## Gerar o instalador Windows (.exe)

O instalador `.exe` é gerado **no Linux** usando o compilador NSIS. O arquivo gerado pode ser copiado para qualquer máquina Windows.

### Passo a passo

```bash
# 1. Instale as dependências de build
sudo apt install nsis nodejs npm

# 2. Para ícone personalizado (opcional — sem isto usa ícone padrão do Windows)
sudo apt install inkscape imagemagick

# 3. Execute o script
chmod +x build-windows.sh
./build-windows.sh
```

Ao final, o arquivo `PDB-Explorer-Setup.exe` será gerado na raiz do projeto:

```
✅ Pronto!
-rw-r--r-- 1 user user 8.5M jun  4 12:00 PDB-Explorer-Setup.exe
```

### O que o script faz (resumo)

1. Executa `npm ci && npm run build` no frontend
2. Empacota o backend em `pdb-explorer-windows-pkg/`
3. Gera o script PowerShell `iniciar.ps1` (inicializa venv, instala dependências, inicia servidor)
4. Gera `iniciar.cmd` (chamado pelo atalho do Windows; chama o PowerShell sem janela visível)
5. Converte o ícone SVG → ICO (se `inkscape` e `imagemagick` estiverem presentes)
6. Gera o script NSIS `pdb-explorer.nsi`
7. Compila o instalador com `makensis`

---

## Instalar o .exe no Windows

### Requisito obrigatório

**Python 3.10+** deve estar instalado e adicionado ao PATH.

- Baixe em: https://www.python.org/downloads/
- Durante a instalação, marque **"Add Python to PATH"**

### Instalação

1. Dê duplo clique em `PDB-Explorer-Setup.exe`
2. Siga o assistente: **Next → Install → Finish**
3. Um atalho **PDB Explorer** é criado na Área de Trabalho e no Menu Iniciar
4. Marque "Abrir PDB Explorer agora" na tela final para iniciar imediatamente

### Primeira execução

1. Clique no atalho **PDB Explorer**
2. Uma janela de progresso aparecerá durante a configuração inicial (~1 minuto)
3. O navegador padrão abrirá em **http://localhost:8080**

### Onde ficam os dados do usuário (Windows)

| Item | Caminho |
|---|---|
| Banco de dados (SQLite) | `%LOCALAPPDATA%\PDB Explorer\pdb_explorer.db` |
| Arquivos PDB baixados | `%LOCALAPPDATA%\PDB Explorer\pdb_files\` |
| Configurações (.env) | `%LOCALAPPDATA%\PDB Explorer\.env` |
| Logs | `%LOCALAPPDATA%\PDB Explorer\pdb_explorer.log` |
| Virtualenv Python | `%LOCALAPPDATA%\PDB Explorer\.venv\` |

---

## Configuração do arquivo .env

O arquivo `.env` é criado automaticamente na primeira execução a partir do `.env.example`.
Para customizar, edite o arquivo no caminho correspondente ao seu sistema:

- **Linux (instalado):** `~/.local/share/pdb-explorer/.env`
- **Windows (instalado):** `%LOCALAPPDATA%\PDB Explorer\.env`
- **Desenvolvimento:** `backend/.env`

### Variáveis disponíveis

```env
# Banco de dados
# Dev: deixe comentado (SQLite automático)
# Prod: descomente e configure o PostgreSQL
# DATABASE_URL=postgresql://usuario:senha@localhost:5432/pdb_explorer

# Segurança JWT (gerado automaticamente na instalação)
SECRET_KEY=sua_chave_secreta_aqui
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# DrugHunter (necessário apenas para usar redocking)
DRUG_HUNTER_PATH=/home/SEU_USUARIO/DrugHunter

# E-mail para notificação ao fim do redocking
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_FROM=PDB Explorer <seu_email@gmail.com>
```

---

## Configuração do DrugHunter (redocking)

A funcionalidade de redocking requer o [DrugHunter](https://github.com/michelclemer/DrugHunter) instalado separadamente.

### 1. Clone o DrugHunter

```bash
git clone https://github.com/michelclemer/DrugHunter.git ~/DrugHunter
```

### 2. Instale as dependências do DrugHunter

Siga as instruções do repositório DrugHunter. O DrugHunter utiliza Anaconda — recomenda-se criar um ambiente conda dedicado.

### 3. Configure a variável no .env

Edite o `.env` e aponte `DRUG_HUNTER_PATH` para o diretório raiz do DrugHunter:

```env
# Linux/macOS
DRUG_HUNTER_PATH=/home/SEU_USUARIO/DrugHunter

# Windows
DRUG_HUNTER_PATH=C:\Users\SEU_USUARIO\DrugHunter
```

### 4. Prepare os arquivos PDB

O DrugHunter espera os arquivos `.pdb` organizados na pasta configurada em **Pasta dos PDBs (entrada)** na interface de redocking.

### Fluxo de uso

1. Na página de **Busca**, filtre as estruturas desejadas e exporte o `pdb_codes.csv`
2. Na página de **Visualizador**, inspecione e refine a seleção
3. Na página de **Redocking**, importe o `pdb_codes.csv`, configure os parâmetros e clique em **Iniciar Redocking**
4. Acompanhe o progresso — uma notificação por e-mail é enviada ao final
5. Após o término, a tabela do CSV exibirá a coluna **RMSD** com os resultados

---

## Desinstalar

### Linux (.deb)

```bash
sudo dpkg -r pdb-explorer
```

Os dados do usuário em `~/.local/share/pdb-explorer/` **não são removidos** automaticamente (para preservar banco de dados e arquivos PDB). Para remover tudo:

```bash
rm -rf ~/.local/share/pdb-explorer/
```

### Windows (.exe)

- **Painel de Controle → Programas → PDB Explorer → Desinstalar**
- Ou execute `Desinstalar PDB Explorer.exe` dentro da pasta de instalação

Os dados em `%LOCALAPPDATA%\PDB Explorer\` são removidos automaticamente pelo desinstalador.

---

## Estrutura do projeto

```
PDB-Explorer/
├── build.sh                  # Script de build — gera pdb-explorer.deb
├── build-windows.sh          # Script de build — gera PDB-Explorer-Setup.exe
├── assets/
│   └── pdb-explorer.svg      # Ícone da aplicação
├── backend/
│   ├── app/
│   │   ├── core/             # Segurança JWT, dependências FastAPI
│   │   ├── domain/           # Modelos e schemas
│   │   ├── infra/            # Banco, e-mail, storage, DrugHunter runner
│   │   ├── routes/           # Endpoints HTTP
│   │   ├── services/         # Acesso ao banco (SQLAlchemy)
│   │   └── usecases/         # Lógica de negócio
│   ├── redocking.py          # Wrapper CLI para o DrugHunter
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/       # Componentes reutilizáveis
    │   ├── contexts/         # Estado global (Auth, Redocking, Visualizador)
    │   ├── data/             # Adaptadores e use cases do frontend
    │   ├── domain/           # Modelos e interfaces TypeScript
    │   ├── hooks/            # Hooks de página
    │   ├── pages/            # Lógica de cada página
    │   └── templates/        # Componentes presentacionais de página
    └── package.json
```
