# PLAN — Suporte ao formato PDBx/mmCIF (`.cif`)

> Data: 06/04/2026
> Status: planejado, não iniciado
> Dividido em 2 fases: a Fase 1 habilita o download; a Fase 2 implementa a visualização
> (o arquivo `.cif` precisa estar disponível no storage antes de parsear a árvore)

---

## Contexto

O RCSB PDB disponibiliza cada estrutura em dois formatos distintos:

| Formato | Extensão | URL de download |
|---|---|---|
| Legacy PDB | `.pdb` | `https://files.rcsb.org/download/{PDB_ID}.pdb` |
| PDBx/mmCIF | `.cif` | `https://files.rcsb.org/download/{PDB_ID}.cif` |

O formato Legacy já é suportado. Esta feature adiciona suporte completo ao PDBx/mmCIF —
mesmo fluxo de scraping → download → rastreamento → visualização.

### Estrutura de linha CIF (para referência do parser da Fase 2)

```
ATOM   1    N N   . THR A 1 3   ? 83.388 -21.586 21.923 1.00 95.28  ? 2   THR B N   1
```

Colunas (posição por tokens whitespace):

| Índice | Nome do campo mmCIF | Descrição |
|---|---|---|
| 0 | `group_PDB` | Tipo de registro: `ATOM` ou `HETATM` |
| 1 | `id` | Serial do átomo |
| 2 | `type_symbol` | Símbolo do elemento |
| 3 | `label_atom_id` | Nome do átomo (label) |
| 4 | `label_alt_id` | Posição alternativa (`.` = nenhuma) |
| 5 | `label_comp_id` | Nome do resíduo (label) |
| 6 | `label_asym_id` | Cadeia (label) |
| 7 | `label_entity_id` | Entidade |
| 8 | `label_seq_id` | Número de sequência (label) |
| 9 | `pdbx_PDB_ins_code` | Código de inserção (`?` = nenhum) |
| 10 | `Cartn_x` | Coordenada X |
| 11 | `Cartn_y` | Coordenada Y |
| 12 | `Cartn_z` | Coordenada Z |
| 13 | `occupancy` | Ocupância |
| 14 | `B_iso_or_equiv` | Fator B |
| 15 | `pdbx_formal_charge` | Carga formal (`?` = nenhuma) |
| 16 | `auth_seq_id` | Número de sequência (auth) |
| 17 | `auth_comp_id` | Nome do resíduo (auth) |
| 18 | `auth_asym_id` | Cadeia (auth) — equivalente ao `chain` do legacy |
| 19 | `auth_atom_id` | Nome do átomo (auth) |
| 20 | `pdbx_PDB_model_num` | Número do modelo |

> **Agrupamento para a árvore**: usar `group_PDB` × `auth_comp_id` × `auth_asym_id` × `auth_seq_id`
> (mesma lógica do legacy: tipo × resname × chain × resnum)

---

## Premissas levantadas no código existente

| Item | Detalhe |
|---|---|
| Storage | `LocalStorageService` em `pdb_files/` — chave string, ex: `5ESG.pdb`. CIF usará `5ESG.cif` |
| Modelo `Protein` | Tem campos de cache só para legacy (`pdb_file_cached`, `pdb_storage_key`, `pdb_file_size`) |
| Modelo `UserPdbDownload` | `UniqueConstraint("user_id", "protein_id")` — cobre apenas 1 formato por proteína |
| Rota de download | `GET /api/download/pdb/{pdb_id}` — legado, intacto |
| Rota meus-pdbs | `GET /api/download/meus-pdbs` — retorno sem campo `formato` |
| Scraper | `_extrair_campos()` não coleta `link_cif` nem `tem_cif` |
| Modal de download | Não existe — download é disparado diretamente do dashboard |
| "Meus PDBs" | Nome ainda é válido. A página lista estruturas do PDB (não arquivos `.pdb` legacy). Não precisa renomear |

---

---

# FASE 1 — Scraping · Download · Modal · Página de Arquivos

> Objetivo: usuário consegue escolher o formato no modal e baixar o `.cif`; a página "Meus PDBs"
> exibe ambos os formatos e permite filtrar.

---

## 1.1 Backend — Modelo `Protein` (domain)

**Arquivo**: `backend/app/domain/models/protein.py`

Adicionar ao final da classe 3 colunas:

```python
# Campos CIF (espelho dos campos legacy)
cif_file_cached  = Column(Boolean, default=False, nullable=False)
cif_storage_key  = Column(String(50), nullable=True)   # ex: "5ESG.cif"
cif_file_size    = Column(Integer, nullable=True)       # tamanho em bytes

# Disponibilidade de formatos (preenchido no scraping via HEAD request)
tem_legacy = Column(Boolean, default=True, nullable=False)
tem_cif    = Column(Boolean, default=True, nullable=False)
```

> `tem_legacy` e `tem_cif` indicam se o RCSB tem o arquivo disponível. Default `True` porque
> praticamente todos os registros experimentais têm ambos; o scraper corrige para `False`
> se o HEAD request retornar 404.

---

## 1.2 Backend — Modelo `UserPdbDownload` (domain)

**Arquivo**: `backend/app/domain/models/pdb_download.py`

**Problema**: `UniqueConstraint("user_id", "protein_id")` impede que o mesmo usuário baixe
a mesma proteína em dois formatos diferentes.

**Mudança**:

```python
# Adicionar coluna:
formato = Column(String(10), nullable=False, default="legacy")  # "legacy" | "cif"

# Atualizar o __table_args__:
__table_args__ = (UniqueConstraint("user_id", "protein_id", "formato"),)
```

**Migração de banco (SQLite dev)**:

```bash
# Deletar o banco SQLite para recriar com o novo schema:
rm backend/pdb_files/../*.db   # ou o caminho correto do .db
# Na próxima execução do backend, `criar_tabelas()` recria tudo.
```

**Migração PostgreSQL (prod)** — executar manualmente:

```sql
ALTER TABLE user_pdb_downloads ADD COLUMN formato VARCHAR(10) NOT NULL DEFAULT 'legacy';
-- Apagar constraint antiga e criar nova:
ALTER TABLE user_pdb_downloads DROP CONSTRAINT user_pdb_downloads_user_id_protein_id_key;
ALTER TABLE user_pdb_downloads ADD CONSTRAINT user_pdb_downloads_user_id_protein_id_formato_key
  UNIQUE (user_id, protein_id, formato);
```

---

## 1.3 Backend — Scraper (infra/external)

**Arquivo**: `backend/app/infra/external/rcsb_scraper.py`

Em `_extrair_campos()`, adicionar verificação de disponibilidade de formatos via HEAD request:

```python
def _verificar_formato(pdb_id: str, extensao: str) -> bool:
    """Faz um HEAD request para verificar se o arquivo existe no RCSB."""
    url = f"https://files.rcsb.org/download/{pdb_id.upper()}.{extensao}"
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False
```

Adicionar ao retorno de `_extrair_campos()`:

```python
"tem_legacy": _verificar_formato(pdb_id, "pdb"),
"tem_cif":    _verificar_formato(pdb_id, "cif"),
"link_cif":   f"https://files.rcsb.org/download/{pdb_id.upper()}.cif",
```

> Os campos `tem_legacy` e `tem_cif` são usados pelo frontend no modal de seleção de formato.
> Custo: +2 HEAD requests por proteína (~0,3s extra por entrada — aceitável).

---

## 1.4 Backend — Schema `ProteinSchema` (domain/schemas)

**Arquivo**: `backend/app/domain/schemas/search.py`

Adicionar campos ao `ProteinSchema`:

```python
tem_legacy: Optional[bool] = True
tem_cif:    Optional[bool] = True
link_cif:   Optional[str]  = None
cif_file_cached: Optional[bool] = None
```

---

## 1.5 Backend — Service `search.py` (services)

**Arquivo**: `backend/app/services/search.py`

Na função que salva proteínas no cache (`salvar_proteina_no_cache` ou equivalente),
garantir que os novos campos (`tem_legacy`, `tem_cif`, `link_cif`) sejam persistidos no banco.

Na função que serializa para resposta SSE, incluir os novos campos no dicionário retornado.

---

## 1.6 Backend — Rota `GET /api/download/cif/{pdb_id}`

**Arquivo**: `backend/app/routes/download.py`

Criar nova rota espelho da rota legacy:

```python
RCSB_CIF_URL = "https://files.rcsb.org/download/{}.cif"

@router.get("/cif/{pdb_id}")
def download_cif(
    pdb_id: str,
    db: Session = Depends(get_db),
    storage: LocalStorageService = Depends(get_storage),
    usuario: Optional[User] = Depends(get_usuario_opcional),
):
    """
    Baixa o arquivo .cif (PDBx/mmCIF) do RCSB.
    Cacheia no servidor. Registra em user_pdb_downloads com formato='cif'.
    """
    ...
```

Lógica idêntica à rota `/pdb/{pdb_id}`, com:
- `key = f"{pdb_id}.cif"`
- URL do RCSB: `RCSB_CIF_URL`
- Campos atualizados no banco: `cif_file_cached`, `cif_storage_key`, `cif_file_size`
- `UserPdbDownload` criado/atualizado com `formato="cif"`
- `media_type = "chemical/x-cif"` na `StreamingResponse`

---

## 1.7 Backend — Service e Usecase `download.py`

**Arquivo**: `backend/app/services/download.py`

Na função `listar_downloads_usuario`, incluir campo `formato` no retorno:

```python
{
    "pdb_id":          protein.pdb_id,
    "titulo":          protein.titulo,
    "organismo":       protein.organismo,
    "resolucao":       protein.resolucao,
    "metodo":          protein.metodo,
    "pdb_file_size":   protein.pdb_file_size if download.formato == "legacy" else protein.cif_file_size,
    "downloaded_at":   download.downloaded_at.isoformat(),
    "formato":         download.formato,   # ← novo
    "tem_legacy":      protein.tem_legacy, # ← novo (para o modal ao re-baixar)
    "tem_cif":         protein.tem_cif,    # ← novo
}
```

Na função `remover_download_usuario`, adicionar parâmetro `formato`:

```python
def remover_download_usuario(db, user_id, pdb_id: str, formato: str = "legacy") -> bool:
    # Filtra por user_id + pdb_id + formato
```

**Arquivo**: `backend/app/usecases/download.py`

Atualizar `uc_remover_meu_pdb` para receber e repassar `formato`.

---

## 1.8 Backend — Rota `DELETE /api/download/meus-pdbs/{pdb_id}`

**Arquivo**: `backend/app/routes/download.py`

Aceitar query param `formato`:

```python
@router.delete("/meus-pdbs/{pdb_id}", status_code=204)
def remover_meu_pdb(
    pdb_id: str,
    formato: str = "legacy",   # query param
    ...
):
```

---

## 1.9 Frontend — Modelo de domínio

**Arquivo**: `frontend/src/domain/models/search.model.ts`

Adicionar ao `PdbResultModel`:

```typescript
tem_legacy?: boolean;
tem_cif?: boolean;
link_cif?: string;
cif_file_cached?: boolean;
```

**Arquivo**: `frontend/src/domain/models/pdb_files.model.ts`

Adicionar ao `PdbFileModel`:

```typescript
formato: "legacy" | "cif";
tem_legacy?: boolean;
tem_cif?: boolean;
```

---

## 1.10 Frontend — Adapter de search

**Arquivo**: `frontend/src/data/adapters/search.adapter.ts`

Garantir que `tem_legacy`, `tem_cif`, `link_cif`, `cif_file_cached` passem do raw para o model.
(O spread `...(raw as PdbResultModel)` já cobre se os campos estiverem no tipo.)

**Arquivo**: `frontend/src/data/adapters/pdb_files.adapter.ts`

Adicionar mapeamento do campo `formato` (com fallback `"legacy"` para registros antigos).

---

## 1.11 Frontend — Novo componente `DownloadFormatModal`

**Arquivo**: `frontend/src/components/ui/DownloadFormatModal.tsx`

```
Props:
  pdbId: string
  temLegacy: boolean
  temCif: boolean
  onSelectLegacy: () => void
  onSelectCif: () => void
  onClose: () => void
```

Layout:
- Modal centralizado (`fixed inset-0 z-50 flex items-center justify-center`)
- Backdrop semitransparente
- Título: "Escolha o formato para baixar `{pdbId}`"
- Dois botões lado a lado:
  - "Legacy PDB (.pdb)" — desabilitado + `opacity-40 cursor-not-allowed` se `!temLegacy`
  - "PDBx/mmCIF (.cif)" — desabilitado + `opacity-40 cursor-not-allowed` se `!temCif`
- Botão "Cancelar" / clique no backdrop fecha o modal

> Regra: botões desabilitados NÃO disparam onClick. Usar `disabled` + estilo opaco.

---

## 1.12 Frontend — Hook e página de busca (modal de download)

**Arquivo**: `frontend/src/hooks/useDashboard.ts`

Estado adicional:

```typescript
const [modalDownload, setModalDownload] = useState<{
  pdbId: string;
  temLegacy: boolean;
  temCif: boolean;
} | null>(null);
```

No handler de download em lote (`handleDownload` ou equivalente):
- Se `selecionados.length === 1` → abrir modal passando `{ pdbId, temLegacy, temCif }`
- Se múltiplos → abrir modal com formato único para o lote (precisa de UI dedicada — ver nota abaixo)

> **Nota sobre download em lote**: para múltiplos itens, mostrar o modal uma vez pedindo
> o formato desejado para todos (ex: "Baixar [N] arquivos — escolha o formato").
> Os itens que não tiverem o formato disponível são pulados (ou exibidos como aviso).

Handlers:

```typescript
const handleConfirmarFormato = (formato: "legacy" | "cif") => {
  setModalDownload(null);
  // dispara o download no formato escolhido
};
```

**Arquivo**: `frontend/src/templates/dashboard/DashboardTemplate.tsx`

Passar `modalDownload` e handlers via props para renderizar o `DownloadFormatModal`
quando aberto.

---

## 1.13 Frontend — Página "Meus PDBs" (filtro por formato)

**Arquivo**: `frontend/src/pages/PdbFilesPage/usePdbFilesPage.ts`

Adicionar estado de filtro:

```typescript
const [filtroFormato, setFiltroFormato] = useState<"todos" | "legacy" | "cif">("todos");

// arquivos filtrados:
const arquivosFiltrados = arquivos.filter(
  (a) => filtroFormato === "todos" || a.formato === filtroFormato,
);
```

Expor `filtroFormato`, `setFiltroFormato`, `arquivosFiltrados` no retorno.

**Arquivo**: `frontend/src/templates/pdb_files/PdbFilesTemplate.tsx`

- Adicionar barra de filtro com 3 opções: "Todos", "Legacy PDB", "PDBx/mmCIF"
- No card de cada arquivo: exibir badge de formato (`legacy` / `cif`)
- O botão de visualizar deve navegar para rota diferente conforme formato:
  - `legacy` → `/visualizador/${pdb_id}` (já existe)
  - `cif` → `/visualizador-cif/${pdb_id}` (criado na Fase 2)

**Arquivo**: `frontend/src/data/usecases/pdb_files.usecase.ts`

Atualizar `remover()` para enviar `formato` como query param:

```typescript
async remover(pdb_id: string, formato: string, token: string): Promise<void> {
  await this.httpClient.delete(`/download/meus-pdbs/${pdb_id}?formato=${formato}`, { token });
}
```

---

## Checklist Fase 1

### Backend
- [ ] 1.1 `domain/models/protein.py` — colunas CIF + `tem_legacy` / `tem_cif`
- [ ] 1.2 `domain/models/pdb_download.py` — coluna `formato` + nova UniqueConstraint
- [ ] 1.3 `infra/external/rcsb_scraper.py` — `_verificar_formato()` + campos CIF em `_extrair_campos()`
- [ ] 1.4 `domain/schemas/search.py` — novos campos no `ProteinSchema`
- [ ] 1.5 `services/search.py` — persistir e serializar novos campos
- [ ] 1.6 `routes/download.py` — rota `GET /cif/{pdb_id}`
- [ ] 1.7 `services/download.py` + `usecases/download.py` — `formato` no listar e remover
- [ ] 1.8 `routes/download.py` — `DELETE /meus-pdbs/{pdb_id}` aceita `?formato=`
- [ ] Migração do banco SQLite (apagar `.db`) / script SQL para PostgreSQL

### Frontend
- [ ] 1.9 `domain/models/search.model.ts` + `pdb_files.model.ts` — novos campos
- [ ] 1.10 Adapters — `search.adapter.ts` + `pdb_files.adapter.ts`
- [ ] 1.11 Componente `DownloadFormatModal.tsx`
- [ ] 1.12 `useDashboard.ts` + `DashboardTemplate.tsx` — estado do modal + disparo de download
- [ ] 1.13 `usePdbFilesPage.ts` + `PdbFilesTemplate.tsx` — filtro por formato + badge

---

---

# FASE 2 — Visualizador PDBx/mmCIF

> Pré-requisito: Fase 1 concluída e arquivos `.cif` disponíveis no storage para teste.
> Objetivo: página `/visualizador-cif/:pdb_id` com árvore ATOM/HETATM idêntica à do legacy.

---

## 2.1 Backend — Service `visualizador_cif.py` (services)

**Arquivo**: `backend/app/services/visualizador_cif.py` ← **novo arquivo**

Implementar parser para formato CIF (whitespace-delimited, tokens por posição):

```python
def _parse_linha_cif(line: str) -> dict:
    """
    Extrai campos de uma linha ATOM/HETATM do formato PDBx/mmCIF.
    Indexação por posição de token (ver tabela de colunas no início do PLAN).
    """
    tokens = line.split()
    if len(tokens) < 21:
        return {}
    return {
        "tipo":    tokens[0],          # group_PDB
        "serial":  tokens[1],          # id
        "name":    tokens[19],         # auth_atom_id
        "resname": tokens[17],         # auth_comp_id
        "chain":   tokens[18],         # auth_asym_id
        "resnum":  tokens[16],         # auth_seq_id
        "raw":     line.rstrip(),
    }


def construir_arvore_cif(storage: LocalStorageService, pdb_id: str) -> dict:
    """Lê o .cif e retorna a mesma estrutura de árvore do legacy."""
    key = f"{pdb_id.upper()}.cif"
    if not storage.exists(key):
        raise FileNotFoundError(f"Arquivo {key} não encontrado no storage.")
    # ... mesma lógica de agrupamento de `construir_arvore` no visualizador legacy


def buscar_linhas_grupo_cif(
    storage, pdb_id, tipo, resname, chain, resnum
) -> list[str]:
    """Lazy load das linhas raw CIF para um grupo específico."""
    # ... mesma lógica de `buscar_linhas_grupo` do legacy
```

> **Atenção**: linhas do `.cif` que começam com `loop_`, `_atom_site`, `#`, `data_` ou `REMARK` devem ser
> ignoradas (não são ATOM/HETATM). Filtrar apenas linhas onde `tokens[0] in ("ATOM", "HETATM")`.

---

## 2.2 Backend — Usecase `visualizador_cif.py` (usecases)

**Arquivo**: `backend/app/usecases/visualizador_cif.py` ← **novo arquivo**

Idêntico a `usecases/visualizador.py` com as diferenças:
- Usa `svc_cif.construir_arvore_cif()` e `svc_cif.buscar_linhas_grupo_cif()`
- Verifica acesso em `user_pdb_downloads` com `formato="cif"`

```python
def uc_arvore_cif(db, storage, pdb_id, usuario) -> dict: ...
def uc_linhas_grupo_cif(db, storage, pdb_id, tipo, resname, chain, resnum, usuario) -> list[str]: ...
```

---

## 2.3 Backend — Rota `visualizador_cif.py` (routes)

**Arquivo**: `backend/app/routes/visualizador_cif.py` ← **novo arquivo**

Prefix: `/api/visualizador-cif`

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/visualizador-cif/{pdb_id}/arvore` | Retorna árvore do arquivo CIF |
| `GET` | `/api/visualizador-cif/{pdb_id}/linhas` | Lazy load das linhas (query params: `tipo`, `resname`, `chain`, `resnum`) |

Registrar o novo router em `main.py`.

---

## 2.4 Frontend — Domínio e usecase

**Arquivo**: `frontend/src/domain/models/visualizador.model.ts`

O modelo `PdbArvore` já é genérico (`{ATOM: {...}, HETATM: {...}}`). **Reutilizar sem alteração**.

**Arquivo**: `frontend/src/data/usecases/visualizador_cif.usecase.ts` ← **novo arquivo**

Idêntico a `visualizador.usecase.ts` com:
- Endpoint `/visualizador-cif/{pdb_id}/arvore`
- Endpoint `/visualizador-cif/{pdb_id}/linhas`

---

## 2.5 Frontend — Página e hook

**Arquivo**: `frontend/src/pages/VisualizadorCifPage/VisualizadorCifPage.tsx` ← **nova pasta**

**Arquivo**: `frontend/src/pages/VisualizadorCifPage/useVisualizadorCifPage.ts` ← **novo arquivo**

> Ambos são cópias diretas dos arquivos legacy com:
> - Parâmetro de rota: `pdb_id` (mesmo nome)
> - UseCase: `VisualizadorCifUseCase` (novo, injetado via `container.ts`)
> - URL de retorno: `/meus-pdbs` (mesma da legacy)

---

## 2.6 Frontend — Template

**Arquivo**: `frontend/src/templates/visualizador/VisualizadorCifTemplate.tsx` ← **novo arquivo**

> Cópia do `VisualizadorTemplate.tsx` existente.
> Única diferença visual: badge "PDBx/mmCIF" no cabeçalho em vez de "Legacy PDB".
> Toda a lógica de árvore, filtros, lazy load e seleção multi-PDB é idêntica.

---

## 2.7 Frontend — Rotas e container

**Arquivo**: `frontend/src/routes.tsx`

Adicionar:

```tsx
<Route path="/visualizador-cif/:pdb_id" element={
  <RotaProtegida>
    <VisualizadorCifPage visualizadorCifUseCase={container.visualizadorCifUseCase} />
  </RotaProtegida>
} />
```

**Arquivo**: `frontend/src/container.ts`

```typescript
import { VisualizadorCifUseCase } from "./data/usecases/visualizador_cif.usecase";

// dentro do container:
visualizadorCifUseCase = new VisualizadorCifUseCase(this.httpClient);
```

---

## Checklist Fase 2

### Backend
- [ ] 2.1 `services/visualizador_cif.py` — parser CIF + `construir_arvore_cif` + `buscar_linhas_grupo_cif`
- [ ] 2.2 `usecases/visualizador_cif.py` — `uc_arvore_cif` + `uc_linhas_grupo_cif`
- [ ] 2.3 `routes/visualizador_cif.py` — rotas `/arvore` e `/linhas`
- [ ] `main.py` — registrar novo router

### Frontend
- [ ] 2.4 `data/usecases/visualizador_cif.usecase.ts` — novo usecase
- [ ] 2.5 `pages/VisualizadorCifPage/` — nova página + hook
- [ ] 2.6 `templates/visualizador/VisualizadorCifTemplate.tsx` — novo template
- [ ] 2.7 `routes.tsx` + `container.ts` — registrar rota e instanciar usecase

---

## Observações finais

- **"Meus PDBs" é um nome válido**: a página lista estruturas do banco PDB, não apenas arquivos `.pdb` legacy. Não há necessidade de renomear.
- **O storage permanece único** (`pdb_files/`): `.pdb` e `.cif` coexistem na mesma pasta, distinguíveis pela extensão.
- **O visualizador CIF reutiliza todo o contexto `VisualizadorContext`** (seleção multi-PDB acumulada), já que o modelo de árvore é idêntico.
- **Backward compatibility**: registros antigos de `UserPdbDownload` recebem `formato="legacy"` por default via `ALTER TABLE` — nenhum dado histórico é perdido.
