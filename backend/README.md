# PDB Explorer — Fase 1: Backend + Scraper

## O que foi implementado nesta fase

- **Scraper adaptado** (`scraper.py`): aceita busca por proteína, organismo, ou ambos
- **Campo Organismo** capturado da API do RCSB (`rcsb_entity_source_organism.scientific_name`)
- **FastAPI** com endpoint SSE para progresso em tempo real
- **Banco de dados** SQLite (dev) com SQLAlchemy — modelos: `users`, `proteins`, `searches`
- **Cache inteligente**: segunda busca pelo mesmo critério retorna do banco instantaneamente
- **TTL**: proteínas não consultadas há 30 dias são marcadas para limpeza
- **Download CSV** dos resultados filtrados
- **Lista de organismos** disponíveis no banco (para filtros futuros)

## Instalação

### Pré-requisitos
- Python 3.11+
- Node.js 18+ (para o frontend nas fases seguintes)

### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate      # Linux/Mac
# ou: venv\Scripts\activate   # Windows

# Instalar dependências
pip install -r requirements.txt

# Rodar a API
uvicorn app.main:app --reload --port 8000
```

A API estará em: http://localhost:8000
Documentação interativa: http://localhost:8000/docs

## Testar o scraper diretamente (sem a API)

```bash
cd backend

# Busca por organismo
python teste_scraper.py --organismo "Candida auris"

# Busca por proteína
python teste_scraper.py --proteina "glucan synthase"

# Busca combinada (proteína + organismo)
python teste_scraper.py --proteina "arabinose dehydrogenase" --organismo "Candida auris"

# Outros fungos
python teste_scraper.py --organismo "Aspergillus fumigatus"
python teste_scraper.py --organismo "Cryptococcus neoformans"
```

## Endpoints da API

### Busca com progresso em tempo real (SSE)
```
GET /api/search/stream?organismo=Candida+auris
GET /api/search/stream?proteina=glucan+synthase
GET /api/search/stream?proteina=arabinose+dehydrogenase&organismo=Candida+auris
```

Eventos SSE retornados:
```json
{"tipo": "inicio",     "total": 42}
{"tipo": "progresso",  "atual": 5, "total": 42, "pdb_id": "8K1I"}
{"tipo": "resultado",  "dado": { "pdb_id": "8K1I", "organismo": "Candidozyma auris", ... }}
{"tipo": "fim",        "total_coletados": 42, "veio_do_cache": false}
```

Se os dados já estiverem em cache:
```json
{"tipo": "cache",     "total": 42}
{"tipo": "resultado", "dado": {...}, "cache": true}
{"tipo": "fim",       "veio_do_cache": true}
```

### Download CSV
```
GET /api/search/csv?organismo=Candida+auris
```

### Listar organismos no banco
```
GET /api/search/organismos
```

### Health check
```
GET /health
```

## Estrutura do projeto

```
backend/
├── app/
│   ├── api/
│   │   └── search.py          ← Rotas de busca (SSE + CSV + organismos)
│   ├── db/
│   │   └── database.py        ← Configuração SQLAlchemy
│   ├── models/
│   │   └── models.py          ← Tabelas: users, proteins, searches
│   ├── schemas/
│   │   └── schemas.py         ← Validação Pydantic
│   ├── services/
│   │   ├── scraper.py         ← Scraper assíncrono com progresso
│   │   └── cache.py           ← Lógica de cache e TTL
│   └── main.py                ← App FastAPI
├── teste_scraper.py           ← Teste standalone do scraper
├── requirements.txt
└── pdb_explorer.db            ← Banco SQLite (criado automaticamente)
```

## Campos capturados por estrutura

| Campo | Descrição |
|-------|-----------|
| `pdb_id` | Código PDB (ex: 8K1I) |
| `titulo` | Título da estrutura |
| `organismo` | **NOVO** — Organismo fonte (ex: Candidozyma auris) |
| `classificacao` | Tipo molecular (ex: OXIDOREDUCTASE) |
| `resolucao` | Resolução em Ångström |
| `metodo` | Método experimental (X-RAY, EM, etc.) |
| `tem_ligante` | Se tem ligante cocristalizado |
| `num_cadeias` | Número de cadeias polipeptídicas |
| `ramachandran` | % de outliers Ramachandran |
| `depositado_em` | Data de depósito |
| `qualidade` | Avaliação: Excelente / Boa / Razoável / Verificar |
| `link_pdb` | Link direto para o RCSB |

## Próximas fases

- **Fase 2**: Banco PostgreSQL + TTL configurável via interface
- **Fase 3**: Sistema de login (JWT)
- **Fase 4**: Frontend React integrado com SSE
- **Fase 5**: Filtros avançados por organismo + melhorias na dashboard
- **Fase 6**: Docker Compose + deploy
