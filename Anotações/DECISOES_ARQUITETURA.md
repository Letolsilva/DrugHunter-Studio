# Decisões de Arquitetura — PDB Explorer

> Documento vivo: atualizar sempre que uma decisão nova for tomada.  
> Última atualização: 25/03/2026

---

## 1. BANCO DE DADOS

### Decisão
- **Desenvolvimento local:** SQLite (sem configuração, arquivo único)
- **Produção:** PostgreSQL
- A troca é feita apenas na variável de ambiente `DATABASE_URL` — zero mudança de código
- O projeto já está preparado para isso em `backend/app/infra/db/database.py`

### Regra fundamental
> **Arquivos `.pdb` NUNCA são armazenados como BLOB no banco.**  
> O banco guarda apenas a *referência* (`pdb_storage_key`). O arquivo vive no storage.

---

## 2. DIAGRAMA DE ENTIDADE-RELACIONAMENTO

```
┌──────────┐        ┌───────────────────────┐        ┌──────────────────────────┐
│  users   │        │   user_pdb_downloads  │        │         proteins         │
├──────────┤        ├───────────────────────┤        ├──────────────────────────┤
│ id  (PK) │──1:N──▶│ id           (PK)     │◀─N:1───│ id             (PK)      │
│ email    │        │ user_id      (FK, NN) │        │ pdb_id         (UNIQUE)  │
│ username │        │ protein_id   (FK, NN) │        │ proteina_buscada         │
│ hash_pwd │        │ downloaded_at         │        │ titulo                   │
│ is_admin │        │                       │        │ organismo                │
│          │        │ UNIQUE(user_id,        │        │ classificacao             │
│          │        │        protein_id)    │        │ resolucao                │
│          │        └───────────────────────┘        │ metodo                   │
│          │                                         │ tem_ligante              │
│          │        ┌──────────────────┐             │ depositado_em            │
│          │──1:N──▶│    searches      │             │ link_pdb                 │
└──────────┘        ├──────────────────┤             │ pdb_file_cached  (bool)  │
                    │ id        (PK)   │             │ pdb_storage_key  (str)   │
                    │ user_id   (FK)   │             │ pdb_file_size    (int)   │
                    │ proteina_query   │             │ criado_em                │
                    │ total_resultados │             │ ultima_consulta          │
                    │ veio_do_cache    │             │ total_consultas          │
                    │ teve_erro        │             └──────────────────────────┘
                    │ criado_em        │
                    └────────┬─────────┘
                             │ 1:N
                    ┌────────▼─────────┐
                    │  search_results  │
                    ├──────────────────┤
                    │ id        (PK)   │
                    │ search_id (FK)   │
                    │ protein_id(FK)   │
                    │ UNIQUE(search_id,│
                    │  protein_id)     │
                    └──────────────────┘
```

### Regras de integridade
| Relação | Cardinalidade | On Delete |
|---------|--------------|-----------|
| user → searches | 1:N | SET NULL (histórico mantido) |
| user → user_pdb_downloads | 1:N | CASCADE |
| protein → user_pdb_downloads | 1:N | CASCADE |
| search → search_results | 1:N | CASCADE |
| protein → search_results | 1:N | CASCADE |

### Por que `user_id NOT NULL` em `user_pdb_downloads`
Em PostgreSQL, `UNIQUE(user_id, protein_id)` com NULL quebra silenciosamente:
`NULL ≠ NULL` na checagem de unicidade, permitindo duplicatas anônimas.  
**Solução:** só registrar na tabela se o usuário estiver logado.
- Download anônimo → só cacheia o arquivo no storage
- Download logado → cacheia + cria linha em `user_pdb_downloads`

---

## 3. STORAGE DE ARQUIVOS .PDB

### Decisão
Campo `pdb_storage_key` na tabela `proteins` guarda apenas a **chave relativa** do arquivo (ex: `"5ESG.pdb"`).  
Quem resolve onde o arquivo vive é o `StorageService`, injetado via dependência FastAPI.

### Ambientes
| Ambiente | Implementação | Onde o arquivo vive |
|----------|--------------|---------------------|
| Dev local | `LocalStorageService` | `backend/pdb_files/5ESG.pdb` |
| Produção | `S3StorageService` (a criar) | `s3://bucket/pdb_files/5ESG.pdb` |

### Contrato da interface
```python
class StorageService(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def exists(self, key: str) -> bool: ...
    def read(self, key: str) -> bytes: ...
    def get_file_path(self, key: str) -> str: ...
```
Trocar de disco para S3 = implementar `S3StorageService` com o mesmo contrato.  
Nenhuma outra linha do projeto muda.

---

## 4. FLUXO DE DOWNLOAD DE ARQUIVOS .PDB

```
Usuário clica ⬇
      │
      ▼
Frontend chama GET /api/download/pdb/{pdb_id}
      │
      ▼
Backend: StorageService.exists("5ESG.pdb")?
      │
      ├─ NÃO → busca em files.rcsb.org/download/5ESG.pdb
      │         StorageService.save("5ESG.pdb", dados)
      │         protein.pdb_file_cached = True
      │         protein.pdb_storage_key = "5ESG.pdb"
      │
      ├─ SIM → serve direto do storage
      │
      ▼
Usuário logado? → SIM → upsert em user_pdb_downloads
                → NÃO → apenas serve o arquivo (sem registro)
      │
      ▼
Retorna arquivo com Content-Disposition: attachment
      │
      ▼
Frontend: File System Access API salva na pasta escolhida pelo usuário
```

---

## 5. DECISÕES DE FRONTEND

### File System Access API
- Pasta escolhida pelo usuário fica em memória na sessão (state/ref no hook)
- Ao fechar o browser, perdida — na próxima sessão abre o picker novamente
- API: `window.showDirectoryPicker()` para pasta de PDB files
- API: `window.showSaveFilePicker()` para CSV

### Checkboxes / Seleção em lote
- "Selecionar todos" seleciona **todos os filtrados** (todas as páginas, não só a atual)
- Estado: `Set<string>` de `pdb_id`s no `useDashboard.ts`
- Download em lote: **sequencial**, delay 150ms entre arquivos (respeitando rate limit RCSB)

### Filtros
- Removido: `filtroQualidade` (junto com todas as colunas de qualidade)
- Adicionado: `filtroResolucaoMax` — input numérico, filtra `resolucao <= valor`

---

## 6. REMOÇÕES DEFINITIVAS

Tudo abaixo foi **removido do projeto** e não deve ser reintroduzido:

| O que | Onde estava | Motivo |
|-------|-------------|--------|
| `qualidade` | `Protein`, `ProteinSchema`, `PdbResultModel`, tabela, UI | Substituído por filtro de resolução |
| `num_cadeias` | Idem | Não utilizado nas análises |
| `ramachandran` | Idem | Só existia para calcular `qualidade` |
| `_avaliar_qualidade()` | `rcsb_scraper.py` | Função que gerava `qualidade` |
| `QualityPieChart` | Frontend charts | Substituído por `ResolutionBarChart` |
| `filtroQualidade` | `FiltersBar`, `useDashboard`, `DashboardTemplate` | Substituído por `filtroResolucaoMax` |
| Card "Excelente" | `StatsRow` | Substituído por card "Alta res. (≤2Å)" |
| Ordenação por qualidade | `dashboard.adapter.ts` | Removida da opção de ordenação |

---

## 7. ROTAS DA API

### Existentes (mantidas)
```
GET  /api/search/stream          → busca SSE com progresso
GET  /api/search/csv             → download CSV (sem param qualidade)
GET  /api/search/organismos      → lista organismos disponíveis
DEL  /api/search/cancelar-parcial→ cancela busca em andamento
POST /api/auth/register
POST /api/auth/login
GET  /api/admin/...
```

### Nova
```
GET  /api/download/pdb/{pdb_id}  → baixa arquivo .pdb (cacheia no servidor)
```

### Futura (não implementar agora)
```
GET  /api/pdb/{pdb_id}/view      → serve arquivo para visualizador no site
GET  /api/user/pdb-files         → lista arquivos baixados pelo usuário logado
```

---

## 8. ⚠️ LISTA DE PENDÊNCIAS PARA PRODUÇÃO

> Estas tarefas NÃO fazem parte da implementação atual.  
> São decisões já tomadas que precisam ser executadas antes de ir ao ar.

- [ ] **Trocar SQLite por PostgreSQL**
  - Instalar PostgreSQL no servidor
  - Configurar variável `DATABASE_URL=postgresql://user:senha@host:5432/pdb_explorer`
  - Rodar a aplicação uma vez para criar as tabelas (SQLAlchemy cria automaticamente)
  - Configurar backups automáticos do banco

- [ ] **Implementar `S3StorageService`**
  - Criar `backend/app/infra/storage/s3_storage_service.py`
  - Implementar o mesmo contrato de `StorageService`
  - Adicionar variável de ambiente `STORAGE_BACKEND=s3`
  - Configurar credenciais AWS/MinIO via variáveis de ambiente
  - Migrar arquivos existentes de `pdb_files/` para o bucket S3

- [ ] **Configurar CORS para o domínio de produção**
  - Atualizar `allow_origins` no `main.py` com o domínio real
  - Remover `"*"` do CORS

- [ ] **Variáveis de ambiente sensíveis**
  - `SECRET_KEY` para JWT — usar valor aleatório forte (não o padrão do código)
  - `DATABASE_URL` — não commitar no git
  - Credenciais S3 — não commitar no git
  - Criar arquivo `.env.example` com as variáveis necessárias

- [ ] **Implementar página "Meus Arquivos"**
  - Rota `GET /api/user/pdb-files` no backend
  - Nova página no frontend listando `user_pdb_downloads` do usuário logado
  - Visualizador 3D de estrutura proteica (NGL Viewer ou Mol*)

- [ ] **Rate limiting no endpoint de download**
  - Evitar abuso do `GET /api/download/pdb/{pdb_id}`
  - Considerar `slowapi` (rate limiting para FastAPI)

- [ ] **Configurar diretório `pdb_files/` no servidor**
  - Definir path absoluto via variável de ambiente `PDB_FILES_DIR`
  - Garantir permissões de escrita
  - Configurar backup desse diretório junto com o banco

- [ ] **HTTPS**
  - Configurar certificado SSL (Let's Encrypt ou similar)
  - Redirecionar HTTP → HTTPS
