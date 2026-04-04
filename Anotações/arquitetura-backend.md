# Manifesto de Arquitetura — Backend PDB Explorer

> Última atualização: versão 4.0.0 (FastAPI + arquitetura hexagonal)

---

## 1. Tecnologias

| Camada            | Tecnologia                                     |
| ----------------- | ---------------------------------------------- |
| Framework         | FastAPI                                        |
| Linguagem         | Python 3.12                                    |
| ORM               | SQLAlchemy (síncrono)                          |
| Banco de dados    | SQLite (dev) / PostgreSQL (prod)               |
| Validação         | Pydantic v2 (schemas)                          |
| Autenticação      | JWT — access_token + refresh_token (HS256)     |
| Scraping externo  | urllib (sem dependências extras)               |
| Streaming         | Server-Sent Events via `StreamingResponse`     |
| Scheduler         | asyncio task (TTL cleanup em background)       |

---

## 2. Estrutura de Pastas

```
app/
├── main.py                  # Entry point — monta o FastAPI, registra routers, lifespan
│
├── core/                    # Portas de entrada: adaptam HTTP → domínio
│   ├── deps.py              # Injeção de dependências FastAPI (get_usuario_atual, get_usuario_admin)
│   └── security.py          # Geração e decodificação de JWT (criar_token, decodificar_token)
│
├── domain/                  # Núcleo — sem dependências de HTTP ou banco concreto
│   ├── models/              # Modelos ORM SQLAlchemy (entidades persistidas)
│   │   ├── base.py          # Base declarativa do SQLAlchemy
│   │   ├── user.py          # User — autenticação, roles, is_active
│   │   ├── protein.py       # Protein — cache de estruturas PDB
│   │   ├── search.py        # Search + SearchResult — histórico de buscas
│   │   ├── pdb_download.py  # PdbDownload — registro de downloads de arquivos .pdb
│   │   └── config.py        # Config — chaves de configuração do sistema (TTL etc.)
│   └── schemas/             # Schemas Pydantic — validação de entrada e saída (DTOs)
│       ├── auth.py          # LoginRequest, RegisterRequest, TokenResponse, UserResponse
│       ├── search.py        # CancelarRequest, SearchResultResponse
│       └── admin.py         # ConfigUpdate, UserAdminResponse
│
├── infra/                   # Adapters de saída — implementações concretas de infraestrutura
│   ├── db/
│   │   └── database.py      # Engine, sessão, criar_tabelas(), get_db(), get_config()
│   ├── external/
│   │   └── rcsb_scraper.py  # Adapter HTTP → API RCSB PDB (executar_scraping, parsear_lista_proteinas)
│   ├── storage/
│   │   └── storage_service.py # StorageService — leitura/escrita de arquivos .pdb no disco
│   └── scheduler.py         # tarefa_limpeza_ttl() — asyncio task que expira registros antigos
│
├── routes/                  # Adapters de entrada — handlers HTTP (sem lógica de negócio)
│   ├── auth.py              # POST /api/auth/login, /register, /refresh, GET /me
│   ├── search.py            # GET /api/search/stream (SSE), GET /api/search/csv
│   ├── admin.py             # GET/PUT /api/admin/config, GET /api/admin/users, ...
│   └── download.py          # GET /api/download/{pdb_id} — download de arquivo .pdb
│
├── usecases/                # Orquestração — lógica de aplicação (não conhece HTTP)
│   ├── auth.py              # uc_login, uc_register, uc_refresh, uc_me
│   ├── search.py            # uc_buscar_stream (gerador SSE), uc_download_csv
│   └── admin.py             # uc_get_config, uc_set_config, uc_listar_users, ...
│
└── services/                # Repositórios — acesso a dados (só conhece Session e modelos)
    ├── auth.py              # buscar_por_email, criar_usuario, atualizar_refresh_token
    ├── search.py            # separar_cache_e_pendentes, salvar_proteina_no_cache, registrar_busca
    └── admin.py             # listar_configs, atualizar_config, listar_users, ...
```

---

## 3. Arquitetura Hexagonal — Camadas e Responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADAPTERS DE ENTRADA                         │
│  routes/auth.py   routes/search.py   routes/admin.py           │
│  (HTTP → valida schema → chama usecase → retorna Response)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ delega
┌───────────────────────────▼─────────────────────────────────────┐
│                      CASOS DE USO                               │
│  usecases/auth.py   usecases/search.py   usecases/admin.py      │
│  (orquestra regras de negócio, não conhece HTTP nem banco)      │
└──────────┬─────────────────────────────────────┬────────────────┘
           │ acessa dados via                     │ chama adapters externos via
┌──────────▼───────────────┐        ┌────────────▼───────────────┐
│       SERVICES           │        │      INFRA EXTERNA         │
│  services/auth.py        │        │  infra/external/           │
│  services/search.py      │        │  rcsb_scraper.py           │
│  services/admin.py       │        │  infra/storage/            │
│  (SQL puro via Session)  │        │  storage_service.py        │
└──────────┬───────────────┘        └────────────────────────────┘
           │ usa
┌──────────▼───────────────┐
│        DOMÍNIO           │
│  domain/models/          │
│  domain/schemas/         │
│  (entidades puras, sem   │
│   import de HTTP/db)     │
└──────────────────────────┘
```

---

## 4. Fluxo de uma Requisição

### Exemplo: busca de proteínas via SSE (`GET /api/search/stream`)

```
Cliente HTTP
  └─ GET /api/search/stream?proteinas=glucan+synthase&forcar_novo=false
       │
       ▼
routes/search.py :: buscar_stream()
  ├─ extrai parâmetros (Query params)
  ├─ resolve dependências (get_db, get_usuario_opcional via core/deps.py)
  └─ retorna StreamingResponse(uc_buscar_stream(...))
       │
       ▼
usecases/search.py :: uc_buscar_stream()
  ├─ chama service.separar_cache_e_pendentes()  → verifica cache no banco
  ├─ yield _sse({"tipo": "cache_hit", ...})     → emite eventos SSE
  ├─ chama rcsb_scraper.executar_scraping()     → busca na API RCSB
  ├─ yield _sse({"tipo": "resultado", ...})     → stream de resultados
  ├─ chama service.salvar_proteina_no_cache()   → persiste no banco
  └─ chama service.registrar_busca()            → salva histórico
       │
┌──────┴──────────────────────────────────────────────┐
│                                                      │
▼                                                      ▼
services/search.py                          infra/external/rcsb_scraper.py
  └─ queries SQLAlchemy                       └─ urllib → API RCSB PDB
     (Protein, Search, SearchResult)             → yield dicts de estruturas
```

### Exemplo: login (`POST /api/auth/login`)

```
routes/auth.py :: login()
  └─ valida LoginRequest (Pydantic)
       │
       ▼
usecases/auth.py :: uc_login()
  ├─ service.buscar_por_email(db, email)      → busca User no banco
  ├─ security.verificar_senha(plain, hash)    → bcrypt
  ├─ security.criar_token("access", user.id)  → JWT
  ├─ security.criar_token("refresh", user.id) → JWT
  └─ service.atualizar_refresh_token(db, ...) → persiste refresh no banco
       │
       ▼
routes/auth.py → retorna TokenResponse (access_token, refresh_token)
```

---

## 5. Portas e Adapters (Hexagonal)

| Tipo                | Arquivo                          | Descrição                                       |
| ------------------- | -------------------------------- | ----------------------------------------------- |
| **Adapter entrada** | `routes/auth.py`                 | HTTP → domínio (autenticação)                   |
| **Adapter entrada** | `routes/search.py`               | HTTP/SSE → domínio (busca)                      |
| **Adapter entrada** | `routes/admin.py`                | HTTP → domínio (administração)                  |
| **Adapter entrada** | `routes/download.py`             | HTTP → domínio (download de arquivos)           |
| **Porta de entrada**| `core/deps.py`                   | JWT → User (traduz protocolo HTTP para domínio) |
| **Adapter saída**   | `infra/db/database.py`           | Sessão SQLAlchemy (banco concreto)               |
| **Adapter saída**   | `infra/external/rcsb_scraper.py` | urllib → API RCSB PDB                           |
| **Adapter saída**   | `infra/storage/storage_service.py` | Sistema de arquivos → disco local             |
| **Adapter saída**   | `infra/scheduler.py`             | asyncio task → limpeza TTL em background        |

---

## 6. Regras de Dependência

```
routes/   → pode importar: usecases/, core/, domain/schemas/
usecases/ → pode importar: services/, infra/external/, infra/storage/, domain/models/, core/security
services/ → pode importar: domain/models/, infra/db/
domain/   → não importa nenhuma outra camada do projeto
```

**Proibido:**
- `routes/` chamar `services/` diretamente (bypassar usecases)
- `usecases/` importar `fastapi`, `Request`, `Response`
- `domain/models/` importar qualquer coisa fora do próprio `domain/`
- `services/` conhecer detalhes de HTTP ou SSE

---

## 7. Autenticação JWT

| Token          | TTL      | Uso                                       |
| -------------- | -------- | ----------------------------------------- |
| `access_token` | 30 min   | Enviado no header `Authorization: Bearer` |
| `refresh_token`| 7 dias   | Enviado no body para `POST /api/auth/refresh` |

- `core/deps.py :: get_usuario_atual` — extrai e valida o JWT em rotas protegidas
- `core/deps.py :: get_usuario_opcional` — retorna `None` se não autenticado (busca anônima)
- `core/deps.py :: get_usuario_admin` — exige `role == "admin"`

---

## 8. Streaming SSE

O endpoint `GET /api/search/stream` retorna `text/event-stream`.

Formato de cada evento:

```
data: {"tipo": "cache_hit", "total": 3}

data: {"tipo": "progresso", "proteina": "glucan synthase", "atual": 1, "total": 10}

data: {"tipo": "resultado", "dado": {...}, "cache": false}

data: {"tipo": "erro_proteina", "proteina": "XYZ", "msg": "Nenhum resultado encontrado"}

data: {"tipo": "fim", "total_coletados": 10, "veio_do_cache": false}
```

---

## 9. Scheduler de Limpeza TTL

`infra/scheduler.py :: tarefa_limpeza_ttl()` é uma `asyncio.Task` criada no `lifespan` da aplicação.

- Roda a cada 24 horas
- Lê o TTL configurado via `get_config(db, "ttl_dias")` (padrão: 30 dias)
- Remove `Search` + `SearchResult` + `Protein` sem consultas recentes
- Controlado pela config `limpeza_automatica` (pode ser desativado pelo admin)
