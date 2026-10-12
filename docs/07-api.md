# API REST

Prefixo `/api`. Documentação interativa gerada pelo FastAPI em `/docs` (Swagger UI) e `/redoc` quando o servidor está
em execução. `GET /health` é público.

**Autenticação**: `PUBLIC` sem token · `OPT` Bearer **ou** `?token=` (necessário para `EventSource` e `<img>`) ·
`USER` JWT *access* · `ADMIN` JWT de administrador.

## Autenticação (`/api/auth`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/register` | PUBLIC | Cadastro (201) |
| POST | `/login` | PUBLIC | Form OAuth2; `username` aceita e-mail ou usuário |
| POST | `/refresh` | PUBLIC | Troca *refresh* por novo *access* |
| GET | `/me` | USER | Perfil |
| GET/DELETE | `/me/historico[/{id}]` | USER | Histórico de buscas |
| PUT | `/me/senha` | USER | Alterar senha |
| GET | `/admin/usuarios` | ADMIN | Listar usuários |
| PUT | `/admin/usuarios/{id}/toggle-ativo` | ADMIN | Ativar/desativar |

## Busca e download

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/search/stream` | OPT | **SSE**: `proteinas`, `limite`, `forcar_novo` |
| GET | `/api/search/csv` | PUBLIC | CSV do cache filtrado por organismo |
| GET | `/api/search/organismos` | PUBLIC | Organismos em cache |
| DELETE | `/api/search/cancelar-parcial` | PUBLIC | Remove proteínas parciais de uma busca interrompida |
| GET | `/api/download/pdb/{id}`, `/cif/{id}` | OPT | Baixa estrutura |
| GET | `/api/download/meus-pdbs` | USER | Arquivos do usuário |
| DELETE | `/api/download/meus-pdbs/{id}?formato=` | USER | Remove o vínculo (arquivo permanece) |
| GET | `/api/download/visualizar[-cif]/{id}` e `/linhas` | USER | Árvore de resíduos e linhas brutas |

## Jobs do pipeline

| Módulo | Prefixo | Principais rotas |
|---|---|---|
| Redocking | `/api/redocking` | `POST /iniciar`, `GET /jobs`, `GET /jobs/status/{id}`, `PUT/GET /csv`, `GET /defaults`, `GET /prontidao`, `POST /preparar` |
| ChEMBL | `/api/chembl` | `POST /run`, `GET /jobs[/{id}]`, `/molecules`, `/analysis-status`, `/networks`, `/plot/{arquivo}`, `POST /analise`, `DELETE /jobs/{id}` |
| ADMET | `/api/admet` | `POST /run`, `GET /results/{id}`, `/results/{id}/molecules`, `/results/{id}/download/{tipo}`, `/results/by-item/{id}` |
| Clustering | `/api/clustering` | `POST /iniciar`, `GET /{id}`, `/{id}/plot`, `/{id}/centroid/{n}`, `/{id}/tsne-data`, `/{id}/download`, `DELETE` |
| Consenso | `/api/consensus` | `POST /iniciar`, `GET /{id}`, `/{id}/correlation`, `/{id}/download`, `/by-admet/{id}`, `/redocking-jobs` |
| NeuroDock | `/api/neurodock` | `POST /treinar`, `GET /model/{id}[/config\|/plots/count\|/plot]`, `POST /model/{id}/predict`, `GET /prediction/{id}[/download/top\|all]` |
| Dinâmica molecular | `/api/molecular-dynamics` | `POST /iniciar`, `POST /upload/{ligante\|receptor}`, `GET /jobs`, `/job/{id}[/files]`, `POST /job/{id}/analyse`, `GET /job/{id}/analysis[/files\|/view/...]` |

Respostas de criação de job retornam **202** com o objeto do job (`status`, `id`, …). O cliente consulta `GET /{id}`
periodicamente até `done`, `error` ou `cancelled`.

## Controle de jobs (`/api/jobs`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/jobs/{kind}/{id}/cancel` | USER | Cancela um job `pending` ou `running`; grava `cancelled` e encerra o subprocesso. `kind`: `redocking`, `chembl`, `admet`, `clustering`, `consensus`, `neurodock-model`, `neurodock-prediction`, `md`, `md-analysis`. Respostas: 200, 404 (inexistente, de outro usuário ou `kind` inválido), 409 (já terminou) |

## Administração e saúde do ambiente

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/validar-drughunter` | Checklist: diretório, estrutura, Python, importação de `perform_redocking`, `bson`, Chimera, Dock6, `dms`, `obabel`, `antechamber` |
| POST | `/api/admin/corrigir-bson` | `pip uninstall bson` no `python_bin` |
| GET/PUT | `/api/admin/config[/{chave}]` | Configuração (validada por faixa) |
| POST | `/api/admin/cache/limpar` | Limpa proteínas expiradas |
| GET | `/api/admin/stats`, `/users`, `/organismos` | Estatísticas e listagens |
| PATCH | `/api/admin/users/{id}` | Promover/rebaixar administrador |
| GET | `/api/home/status` | Estado do ambiente e últimas atividades (USER) |
