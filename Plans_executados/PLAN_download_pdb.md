# PLAN — Download PDB Legacy, Seleção em Lote e Limpeza de Colunas

> Status: **APROVADO — PRONTO PARA EXECUÇÃO**  
> Data de início: 25/03/2026
Semana do dia 24
permitir o usuario bauxar o legacy (1°) -> deixar definir onde vai salvar  -> abrir o segundo dowload ja abrir na pasta que ele selecionou o primeiro 
remover Cadeias, Qualidade para adicionar os de donwload
baixar csv deixar escolher a pasta
baixar um lote com checkbox e considerar o filtro  -> salvar em arquivos separados cada um -> modal com opçoes de qual tipo de arquivo 
tirar o filtro de qualidade e adicionar o de resolução

---

## DECISÕES FINAIS (todas aprovadas)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Remoção de Qualidade + Cadeias | ✅ Remover **tudo** — banco, backend, frontend |
| 2 | Banco de dados | ✅ **Recriar do zero** (deletar `pdb_explorer.db`) |
| 3 | Armazenamento dos arquivos .pdb | ✅ **Backend salva no servidor** (`backend/pdb_files/`) para uso futuro no site |
| 4 | Download p/ computador do usuário | ✅ **Proxy pelo backend** + File System Access API no browser |
| 5 | Selecionar todos | ✅ **Todos os filtrados** (todas as páginas, não só a atual) |
| 6 | Filtro de resolução | ✅ **Input numérico** "Resolução máx. (Å)" — filtra ≤ valor digitado |
| 7 | Download em lote | ✅ **Sequencial** com delay 150ms, com barra de progresso inline |
| 8 | Barra de progresso | ✅ Novo componente simples `DownloadProgressBar` reutilizando o estilo visual do `ProgressCard` existente (mesmo gradiente, mesmas cores) |
| 9 | Persistência da pasta | ✅ **Só na sessão** — `dirHandle` guardado em memória (state/ref no hook) |
| 10 | QualityPieChart | ✅ **Substituir** por `ResolutionBarChart` — distribuição de resolução em faixas |
| 11 | Ordenação | ✅ Remover opção "qualidade" do `<select>` de ordenação |
| 12 | CSV picker | ✅ `showSaveFilePicker` para CSV também |

---

## 1. BANCO DE DADOS — O QUE MUDA

### Decisão de banco
- **Dev:** SQLite (já configurado via `DATABASE_URL`)
- **Produção:** PostgreSQL — só troca a variável de ambiente `DATABASE_URL`
- **Arquivos .pdb:** NUNCA em BLOB no banco — sempre em storage externo (disco agora, S3 futuramente)
- O código já suporta a troca de banco sem alterações

### 1.1 Recriar do zero
- **Ação:** Deletar `backend/pdb_explorer.db` antes de rodar a aplicação
- SQLAlchemy recria todas as tabelas no startup via `criar_tabelas()`
- Sem migrations necessárias

### 1.2 Colunas a remover/adicionar no model `Protein`
```
REMOVER:
  - num_cadeias   (Integer)
  - ramachandran  (Float)
  - qualidade     (String)

ADICIONAR:
  - pdb_file_cached   (Boolean, default=False) — arquivo existe no storage?
  - pdb_storage_key   (String, nullable=True)  — chave relativa: "5ESG.pdb"
  - pdb_file_size     (Integer, nullable=True) — tamanho em bytes (informativo)
```

> **Por que `pdb_storage_key` em vez de caminho absoluto?**
> O valor "5ESG.pdb" nunca muda entre ambientes.
> Em dev, o StorageService resolve para `backend/pdb_files/5ESG.pdb`.
> Em produção, resolve para `s3://bucket/pdb_files/5ESG.pdb`.
> Migrar de disco para S3 = trocar a implementação do StorageService, não o banco.

> **NOTA:** `Protein` é cache GLOBAL (compartilhado entre todos os usuários).
> O rastreamento por usuário fica na tabela nova abaixo.

### 1.2.1 Nova tabela: `UserPdbDownload`

Rastreia **quem baixou qual arquivo** — necessário para a fase futura em que
usuários acessarão seus arquivos dentro do site.

```python
class UserPdbDownload(Base):
    """Registro de quais arquivos .pdb cada usuário logado baixou."""
    __tablename__ = "user_pdb_downloads"
    __table_args__ = (UniqueConstraint("user_id", "protein_id"),)

    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    protein_id    = Column(Integer, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False)
    downloaded_at = Column(DateTime, default=datetime.utcnow)

    user    = relationship("User", back_populates="pdb_downloads")
    protein = relationship("Protein")
```

**Por que `user_id` é NOT NULL (não nullable)?**
- Em PostgreSQL, `UNIQUE(user_id, protein_id)` com NULL não funciona como esperado:
  `NULL ≠ NULL` na checagem, então múltiplas linhas anônimas para a mesma proteína
  não violam o constraint — o índice fica corrompido silenciosamente.
- Decisão mais limpa: só registra na tabela se o usuário estiver logado.
- **Download anônimo** → apenas cacheia o arquivo (`pdb_file_cached = True`) mas
  NÃO cria linha em `user_pdb_downloads`.
- **Download logado** → cacheia arquivo + cria/atualiza `user_pdb_downloads`.

**Relação em `User`:**
```python
pdb_downloads = relationship("UserPdbDownload", back_populates="user")
```

**Arquivo a criar:** `backend/app/domain/models/pdb_download.py`

**Registrar no** `backend/app/domain/models/__init__.py`

### 1.2.2 Abstração de storage (preparação para S3)

**Arquivo a criar:** `backend/app/infra/storage/storage_service.py`

```python
# Interface comum — LocalStorageService agora, S3StorageService no futuro
class StorageService(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def exists(self, key: str) -> bool: ...
    def read(self, key: str) -> bytes: ...
    def get_file_path(self, key: str) -> str: ...  # para FileResponse local

class LocalStorageService:
    BASE_DIR = Path("pdb_files")
    def save(self, key, data):   (BASE_DIR / key).write_bytes(data)
    def exists(self, key):       return (BASE_DIR / key).exists()
    def read(self, key):         return (BASE_DIR / key).read_bytes()
    def get_file_path(self, key): return str(BASE_DIR / key)
```

Quando migrar para S3: adicionar `S3StorageService` que implementa a mesma interface.
Injetado como dependência no endpoint de download via `Depends()`.

### 1.3 Novo diretório no backend
```
backend/
  pdb_files/          ← arquivos .pdb (local dev) — criado automaticamente no startup
  app/
    infra/
      storage/        ← NOVO — abstração de storage
        __init__.py
        storage_service.py   ← LocalStorageService (troca por S3StorageService no futuro)
```

---

## 2. BACKEND — NOVOS ENDPOINTS E MUDANÇAS

### 2.1 Endpoint de download de arquivo PDB
```
GET /api/download/pdb/{pdb_id}
```
**Comportamento:**
1. Verifica se `backend/pdb_files/{pdb_id}.pdb` já existe em disco
2. Se não existe → faz request para `https://files.rcsb.org/download/{pdb_id}.pdb`
3. Salva o arquivo em `backend/pdb_files/{pdb_id}.pdb`
4. Marca `protein.pdb_file_cached = True` + `protein.pdb_file_size` no banco
5. Cria registro em `UserPdbDownload` (com `user_id` do usuário logado, ou NULL se anônimo)
   - Se já existe o registro para esse `user_id + protein_id` → apenas atualiza `downloaded_at`
6. Retorna o arquivo com header `Content-Disposition: attachment; filename={pdb_id}.pdb`

**Rota futura (não implementar agora, apenas anotar):**
```
GET /api/pdb/{pdb_id}/view   → serve o arquivo para visualização no site
GET /api/user/pdb-files      → lista os arquivos baixados pelo usuário logado
```

### 2.2 Mudanças em rotas existentes
- `GET /api/search/csv` → remover parâmetro `qualidade`
- `GET /api/download/pdb/{pdb_id}` → novo (ver acima)

### 2.3 Arquivos backend a modificar
```
backend/
  app/
    domain/
      models/
        protein.py           ← remover colunas, adicionar pdb_file_cached / pdb_storage_key / pdb_file_size
        pdb_download.py      ← NOVO — model UserPdbDownload
        user.py              ← adicionar relationship pdb_downloads
        __init__.py          ← registrar UserPdbDownload
      schemas/
        search.py            ← remover campos do ProteinSchema
    infra/
      storage/               ← NOVO diretório
        __init__.py
        storage_service.py   ← LocalStorageService
      external/
        rcsb_scraper.py      ← remover _avaliar_qualidade(), num_cadeias, ramachandran
    usecases/
      search.py              ← remover campos no _proteina_dict()
    routes/
      search.py              ← remover param qualidade do /csv
      download.py (NOVO)     ← GET /api/download/pdb/{pdb_id}
    main.py                  ← registrar download_router + criar pasta pdb_files no startup
```

---

## 3. FRONTEND — MUDANÇAS

### 3.1 Domain/Models (TypeScript)
```
domain/models/search.model.ts
  REMOVER: num_cadeias, ramachandran, qualidade
  ADICIONAR: pdb_saved?: boolean
```

### 3.2 Filtros
```
domain/models/dashboard.model.ts
  REMOVER: filtroQualidade
  ADICIONAR: filtroResolucaoMax: string   (string p/ input vazio = "todas")

data/adapters/dashboard.adapter.ts
  REMOVER: filtro por qualidade, ordenação por qualidade
  ADICIONAR: filtro resolucaoMax → filtra d.resolucao <= parseFloat(filtroResolucaoMax)
  REMOVER: num_cadeias, ramachandran, qualidade do CSV_COLS

hooks/useDashboard.ts
  REMOVER: filtroQualidade, setFiltroQualidade, dadosQualidade
  ADICIONAR:
    filtroResolucaoMax: string
    setFiltroResolucaoMax: (v: string) => void
    selectedIds: Set<string>
    toggleSelected: (pdbId: string) => void
    toggleSelectAll: () => void
    isAllSelected: boolean
    downloadBatch: () => Promise<void>
    batchProgress: { atual: number; total: number } | null
    dirHandle: FileSystemDirectoryHandle | null
    pickFolder: () => Promise<void>
    downloadSingle: (pdbId: string) => Promise<void>
```

### 3.3 Novo hook: useFileDownload.ts
```
frontend/src/hooks/useFileDownload.ts
  - Responsabilidade: gerenciar dirHandle na sessão, File System Access API
  - Estado: dirHandle (FileSystemDirectoryHandle | null)
  - pickFolder() → abre showDirectoryPicker
  - saveFile(filename, content) → salva na pasta escolhida
  - saveFileFromUrl(filename, url) → fetch(url) + saveFile
```

### 3.4 Componentes a modificar
```
components/dashboard/
  ResultsTable.tsx
    - REMOVER: col Cadeias, col Qualidade (Badge), BADGE_VARIANT
    - ADICIONAR: col Checkbox (primeira col), col Download .pdb (última col)
    - Checkbox header → toggleSelectAll
    - Checkbox linha → toggleSelected(d.pdb_id)

  FiltersBar.tsx
    - REMOVER: filtroQualidade, setFiltroQualidade
    - ADICIONAR: filtroResolucaoMax, setFiltroResolucaoMax (input numérico)

  StatsRow.tsx
    - REMOVER: card "Excelente" (usa d.qualidade)
    - SUBSTITUIR por: card "Resolução ≤ 2Å" (contagem de estruturas de alta resolução)

components/dashboard/DownloadProgressBar.tsx (NOVO)
  - Props: atual: number, total: number, onCancel?: () => void
  - Visual: mesmo estilo de ProgressCard (gradiente accent, border-outline)
  - Simples: barra + texto "Baixando X de Y..."
  - Usado apenas durante batch download

charts/
  QualityPieChart.tsx  → NÃO DELETAR o arquivo físico agora, apenas parar de usar
  ResolutionBarChart.tsx (NOVO) — barras por faixa: <1.5 / 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / >3.0 Å
```

### 3.5 Templates e Pages
```
templates/dashboard/DashboardTemplate.tsx
  - REMOVER: QualityPieChart, props filtroQualidade/setFiltroQualidade/dadosQualidade
  - ADICIONAR: ResolutionBarChart (dadosResolucao), DownloadProgressBar (condicional)
  - ADICIONAR: botão "⬇ Baixar selecionados (.pdb)" (visível quando selectedIds.size > 0)
  - ADICIONAR: texto "X selecionados (de Y filtrados)"
  - MODIFICAR: botão CSV → chama downloadCSV com showSaveFilePicker

pages/HistoryDashboardPage/useHistoryDashboardPage.ts
  - Verificar se passa filtroQualidade → remover
```

### 3.6 Tabela de colunas final
```
[ ] Checkbox | PDB ID | Título | Organismo | Proteína | Resolução | Método | Ligante | Data | Link | ⬇ PDB
```

---

## 4. DADOS DOS GRÁFICOS

### Chart de Resolução (substitui Qualidade)
```typescript
// No dashboard.adapter.ts — getChartData()
// Adicionar:
const faixasResolucao = [
  { name: "< 1.5 Å",   min: 0,   max: 1.5  },
  { name: "1.5–2.0 Å", min: 1.5, max: 2.0  },
  { name: "2.0–2.5 Å", min: 2.0, max: 2.5  },
  { name: "2.5–3.0 Å", min: 2.5, max: 3.0  },
  { name: "> 3.0 Å",   min: 3.0, max: 9999 },
  { name: "N/D",       min: -1,  max: -1   }, // sem resolução (ex: cryo-EM sem res)
]
```

---

## 5. FLUXO DE DOWNLOAD (UX)

### Download individual (botão ⬇ na linha)
1. Usuário clica no ⬇ da linha
2. Se `dirHandle` é null → abre `showDirectoryPicker`
3. Hook chama `GET /api/download/pdb/{pdb_id}`
4. Backend salva em `pdb_files/` e retorna o arquivo
5. Browser salva na pasta escolhida via File System Access API
6. Ícone da linha muda para ✓ verde (pdb_saved = true)

### Download em lote
1. Usuário filtra resultados (ex.: resolução ≤ 2.0)
2. Clica em "Selecionar todos" → todos os filtrados marcados (destaque na UI: "47 selecionados")
3. Clica em "⬇ Baixar selecionados (.pdb)"
4. Se `dirHandle` é null → abre `showDirectoryPicker`
5. Inicia download sequencial:
   - Loop: para cada pdb_id, chama `GET /api/download/pdb/{pdb_id}`
   - Espera 150ms entre cada
   - `DownloadProgressBar` mostra "Baixando 3 de 47..."
6. Ao terminar: "47 arquivos salvos em [nome da pasta]"

### Download CSV
1. Usuário clica em "⬇ CSV"
2. Abre `showSaveFilePicker({ suggestedName: 'pdb_resultados.csv' })`
3. Usuário escolhe local → arquivo salvo

---

## 6. ORDEM DE EXECUÇÃO

### Fase 1 — Backend
- [ ] 1.1 Deletar `pdb_explorer.db`
- [ ] 1.2 `protein.py` — remover colunas, adicionar `pdb_file_cached`, `pdb_storage_key`, `pdb_file_size`
- [ ] 1.3 `pdb_download.py` — **NOVO** model `UserPdbDownload` (user_id NOT NULL)
- [ ] 1.4 `user.py` — adicionar relationship `pdb_downloads`
- [ ] 1.5 `models/__init__.py` — registrar `UserPdbDownload`
- [ ] 1.6 `infra/storage/storage_service.py` — **NOVO** `LocalStorageService`
- [ ] 1.7 `search.py` (schemas) — remover campos
- [ ] 1.8 `rcsb_scraper.py` — remover `_avaliar_qualidade`, `num_cadeias`, `ramachandran`
- [ ] 1.9 `usecases/search.py` — remover campos de `_proteina_dict()`
- [ ] 1.10 `routes/search.py` — remover param `qualidade` do `/csv`
- [ ] 1.11 `routes/download.py` — novo arquivo com `GET /api/download/pdb/{pdb_id}`
- [ ] 1.12 `main.py` — registrar router de download + criar pasta `pdb_files` no startup

### Fase 2 — Frontend: limpeza
- [ ] 2.1 `search.model.ts` — remover/adicionar campos
- [ ] 2.2 `dashboard.model.ts` — trocar filtroQualidade por filtroResolucaoMax
- [ ] 2.3 `dashboard.adapter.ts` — novo filtro, remover qualidade, adicionar chart resolução
- [ ] 2.4 `useDashboard.ts` — remover qualidade, adicionar resolução e estado de seleção
- [ ] 2.5 `ResultsTable.tsx` — remover colunas, adicionar checkpoint + download
- [ ] 2.6 `FiltersBar.tsx` — trocar dropdown qualidade por input resolução
- [ ] 2.7 `StatsRow.tsx` — trocar card "Excelente" por "Alta res. (≤2Å)"
- [ ] 2.8 `DashboardTemplate.tsx` — remover QualityPieChart, props relacionadas
- [ ] 2.9 `useHistoryDashboardPage.ts` — verificar e limpar

### Fase 3 — Frontend: novos recursos
- [ ] 3.1 `ResolutionBarChart.tsx` — novo gráfico de barras por faixa
- [ ] 3.2 `useFileDownload.ts` — hook de download/pasta
- [ ] 3.3 `DownloadProgressBar.tsx` — componente de progresso de download
- [ ] 3.4 `useDashboard.ts` — integrar download individual, em lote, CSV com picker
- [ ] 3.5 `DashboardTemplate.tsx` — botão lote, progresso, botão CSV atualizado
- [ ] 3.6 `infra/http/` — adicionar chamada ao novo endpoint de download

### Fase 4 — Validação
- [ ] 4.1 Testar scraping sem campos removidos
- [ ] 4.2 Testar download individual
- [ ] 4.3 Testar seleção em lote + progresso
- [ ] 4.4 Testar filtro de resolução
- [ ] 4.5 Testar CSV com file picker
