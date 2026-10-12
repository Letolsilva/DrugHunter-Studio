# Implantação e segurança

## Execução em desenvolvimento

```bash
# backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# frontend
cd frontend && npm install && npm run dev          # http://localhost:5173 (proxy /api → :8000)
```

## Pacotes

| Alvo | Script | Resultado |
|---|---|---|
| Linux (Debian/Ubuntu) | `build.sh` | `drughunter-studio.deb`: `npm ci && npm run build`, copia o build para `backend/static`, instala em `/opt/drughunter-studio/` |
| Windows | `build-windows.sh` | Instalador NSIS |

No `.deb`, `iniciar.sh` cria um `venv` na primeira execução (`pip install -r requirements.txt`), gera `SECRET_KEY`
aleatória, inicia `uvicorn` em `127.0.0.1:8080` e abre o navegador (`xdg-open`).

!!! info "O pacote não inclui o DrugHunter"
    O DrugHunter, o ambiente conda e as ferramentas (Chimera, Dock6, Vina, OpenBabel, AmberTools, `dms`) são
    **pré-requisitos externos**. A tela `/ajuda` e `GET /api/admin/validar-drughunter` ajudam a verificá-los.

## Onde ficam os dados

| Ambiente | Banco e cache PDB | Artefatos do pipeline |
|---|---|---|
| `.deb` | `~/.local/share/drughunter-studio/` | Dentro do diretório do DrugHunter (`drug_hunter_path`) |
| Windows | `%LOCALAPPDATA%\DrugHunter Studio\` | idem |
| Desenvolvimento | `backend/drughunter_studio.db`, `backend/pdb_files` | idem |

A renomeação de "PDB Explorer" para "DrugHunter Studio" (out/2026) migra uma única vez os dados da pasta antiga
`~/.local/share/pdb-explorer/`, que permanece intacta como cópia de segurança.

## Configuração

Banco (`system_config`, editável pela interface, sem reinício): `drug_hunter_path`, `python_bin`, `chimera_path`,
`dock6_path`, `ttl_dias`, `max_por_proteina`, `limpeza_automatica`, `smtp_*`. Variáveis de ambiente: `DATABASE_URL`,
`SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `DRUG_HUNTER_PATH`, `PYTHON_BIN`,
`CHIMERA_PATH`, `DOCK6_PATH`, `PDB_FILES_DIR`, `SMTP_*`, `PORT`, `DOTENV_PATH`.

!!! warning "Precedência inconsistente"
    Só o redocking e a administração caem para variáveis de ambiente quando a configuração do banco está vazia; os
    demais módulos (ChEMBL, ADMET, clustering, consenso, NeuroDock, MD) leem **apenas do banco**.

## Segurança

| Aspecto | Implementação | Observação |
|---|---|---|
| Senhas | bcrypt (passlib) | — |
| Sessão | JWT HS256; *access* 60 min, *refresh* 7 dias | Sem revogação nem lista de bloqueio |
| Autorização | `get_usuario_atual` reconsulta o usuário; `get_usuario_admin` | Jobs filtrados por `user_id` |
| Segredo SMTP | Fernet; chave derivada de `SHA-256(SECRET_KEY)` | **Trocar `SECRET_KEY` invalida a senha SMTP salva** |
| `SECRET_KEY` | Obrigatória em produção | Há valor padrão inseguro (com aviso); o `.deb` gera um aleatório |
| CORS | Lista fixa (localhost 5173/3000/8080) | Instalação local |
| Token na URL | `?token=` aceito para `EventSource` e imagens | Tokens podem aparecer em logs de acesso |
| Execução de subprocesso | `python_bin` e `drug_hunter_path` vêm da configuração (administrador) | Argumentos de job vão como JSON em `argv` (sem *shell*) |

### Pontos de atenção identificados

- `GET /api/chembl/jobs/{id}/plot/{arquivo}` usa autenticação opcional mas acessa `usuario.id` → **erro 500 para anônimo**.
- `DELETE /api/search/cancelar-parcial` é público e remove **todas** as proteínas do cache cujo `proteina_buscada`
  casa com o termo (`services/search.py:181-199`).
- Biblioteca do NeuroDock é lida de **caminho absoluto no servidor** informado pelo usuário (`library_csv_path`).
- E-mail de conclusão: senha SMTP embutida no pacote `.deb` por substituição de *placeholder* no build.

## Operação

- **Logs**: `drughunter_studio.log` (pasta de dados) e `DH/logs/*.log` (DrugHunter).
- **Limpeza**: tarefa assíncrona 60 s após iniciar e a cada 24 h — remove proteínas expiradas (se habilitado) e buscas com mais de 30 dias (fixo). **Não** limpa arquivos nem jobs.
- **Backup**: copiar o banco SQLite, `pdb_files/` e as pastas `resultados/` e `datasets/` do DrugHunter.
