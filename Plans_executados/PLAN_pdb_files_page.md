# PLAN — Tela "Meus PDBs" (visualização de arquivos baixados)

> Data: 04/04/2026  
> Status: planejado, não iniciado

---

## Objetivo

Criar a página `/meus-pdbs` que lista todos os arquivos `.pdb` que o usuário logado já baixou,
permitindo excluir um registro e, no futuro, clicar para abrir o visualizador de ATOM/HETATM.

---

## Premissas levantadas no código existente

| Item | Detalhe |
|---|---|
| Tabela de rastreamento | `user_pdb_downloads` — relaciona `user_id` ↔ `protein_id` + `downloaded_at` |
| Modelo de proteína | `proteins` — tem `pdb_id`, `titulo`, `organismo`, `resolucao`, `metodo`, `pdb_storage_key` |
| Exclusão | Remove **apenas o registro `UserPdbDownload`** do usuário. O arquivo no servidor é cache compartilhado — não será deletado do disco. |
| Arquitetura back | Hexagonal: rota → usecase → service, sem lógica nas rotas |
| Arquitetura front | Clean: page (thin) → hook (estado) → template (presentacional); usecase injetado via `container.ts` |

---

## 1. Backend

### 1.1 Novo arquivo `services/download.py`

```
services/download.py
```

Funções:

```python
def listar_downloads_usuario(db, user_id: int) -> list[dict]
    # JOIN user_pdb_downloads ↔ proteins
    # Retorna lista de dicts com: pdb_id, titulo, organismo, resolucao, metodo,
    #   pdb_file_size, downloaded_at, protein_id

def remover_download_usuario(db, user_id: int, pdb_id: str) -> bool
    # Localiza o UserPdbDownload via user_id + proteins.pdb_id
    # Deleta o registro; retorna False se não encontrado
```

### 1.2 Novo arquivo `usecases/download.py`

```
usecases/download.py
```

Funções:

```python
def uc_listar_meus_pdbs(db, usuario) -> list[dict]
def uc_remover_meu_pdb(db, usuario, pdb_id: str) -> None
    # Lança HTTPException 404 se não encontrado
```

### 1.3 Novas rotas em `routes/download.py`

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/download/meus-pdbs` | Lista os PDBs baixados pelo usuário logado |
| `DELETE` | `/api/download/meus-pdbs/{pdb_id}` | Remove o vínculo usuário ↔ PDB |

Ambas usam `get_usuario_atual` (autenticação obrigatória).

#### Schema de resposta GET

```json
[
  {
    "pdb_id": "5ESG",
    "titulo": "Crystal structure of...",
    "organismo": "Aspergillus fumigatus",
    "resolucao": 2.1,
    "metodo": "X-RAY DIFFRACTION",
    "pdb_file_size": 123456,
    "downloaded_at": "2026-04-01T12:00:00"
  }
]
```

---

## 2. Frontend

### 2.1 Camada de domínio

**`domain/models/pdb_files.model.ts`**
```ts
export interface PdbFileModel {
  pdb_id: string;
  titulo: string;
  organismo: string;
  resolucao: number | null;
  metodo: string;
  pdb_file_size: number | null;
  downloaded_at: string;
}
```

**`domain/interfaces/pdb_files.interface.ts`**
```ts
export abstract class IPdbFilesUseCase {
  abstract listar(token: string): Promise<PdbFileModel[]>;
  abstract remover(pdb_id: string, token: string): Promise<void>;
}
```

### 2.2 Camada de dados

**`data/adapters/pdb_files.adapter.ts`**  
Normaliza datas e campos nulos vindos da API.

**`data/usecases/pdb_files.usecase.ts`**  
`PdbFilesUseCase extends IPdbFilesUseCase`  
- `GET /download/meus-pdbs`  
- `DELETE /download/meus-pdbs/{pdb_id}`

### 2.3 `container.ts`

Adicionar:
```ts
import { PdbFilesUseCase } from "./data/usecases/pdb_files.usecase";
export const pdbFilesUseCase = new PdbFilesUseCase(httpClient);
```

### 2.4 Page + Hook

**`pages/PdbFilesPage/PdbFilesPage.tsx`** — thin wrapper  
**`pages/PdbFilesPage/usePdbFilesPage.ts`** — estado e handlers

Estado do hook:
```ts
fase: "carregando" | "ok" | "vazio" | "erro"
arquivos: PdbFileModel[]
erroMsg: string
confirmandoExclusao: string | null   // pdb_id em confirmação
handleExcluir: (pdb_id: string) => void  // abre modal
confirmarExclusao: () => void            // faz DELETE
cancelarExclusao: () => void
handleAbrirVisualizador: (pdb_id: string) => void  // navigate futuro
handleLogout: () => void
```

### 2.5 Template

**`templates/pdb_files/PdbFilesTemplate.tsx`**

Recebe todas as props via spread do hook. Zero estado, zero chamada de API.

### 2.6 Componente de Card

**`components/pdb_files/PdbFileCard.tsx`**  

Props:
```ts
arquivo: PdbFileModel
onExcluir: (pdb_id: string) => void
onAbrir: (pdb_id: string) => void
```

---

## 3. Layout — Cards/Grid

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (igual às outras telas)                         │
├─────────────────────────────────────────────────────────┤
│  Título: "Meus PDBs"   [X arquivos baixados]            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  5ESG    │  │  4HVF    │  │  1ABC    │             │
│  │ Titulo.. │  │ Titulo.. │  │ Titulo.. │             │
│  │ Organism │  │ Organism │  │ Organism │             │
│  │ 2.1 Å   │  │ 1.8 Å   │  │ N/A      │             │
│  │ X-RAY   │  │ NEUTRON  │  │ NMR      │             │
│  │ 01/04/26 │  │ 02/04/26 │  │ 03/04/26 │             │
│  │ [Abrir] [🗑] │  │ [Abrir] [🗑] │  │ [Abrir] [🗑] │ │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  [Estado vazio] Nenhum arquivo baixado ainda.           │
│  Vá para busca para baixar estruturas.                  │
└─────────────────────────────────────────────────────────┘
```

**Comportamento do card:**
- Click **no card** (exceto botões) → `handleAbrirVisualizador(pdb_id)` → no momento navega para `/visualizador/:pdb_id` (rota a criar futuramente)
- Botão **Abrir** → mesmo efeito do click no card
- Botão **Excluir (🗑)** → abre modal de confirmação

**Modal de confirmação de exclusão:**
```
┌──────────────────────────────────────┐
│  Remover 5ESG?                       │
│  Isso removerá apenas o vínculo.     │
│  O arquivo no servidor é preservado. │
│  [Cancelar]  [Remover]               │
└──────────────────────────────────────┘
```

**Estados da tela:**
| Estado | Comportamento |
|---|---|
| `carregando` | Skeleton de cards (3 cards cinzas animados) |
| `ok` | Grid de cards |
| `vazio` | Mensagem + botão "Ir para Busca" |
| `erro` | Mensagem de erro |

**Responsividade (Tailwind):**
- Mobile: 1 coluna (`grid-cols-1`)
- Tablet: 2 colunas (`sm:grid-cols-2`)
- Desktop: 3 colunas (`lg:grid-cols-3`)
- Wide: 4 colunas (`xl:grid-cols-4`)

---

## 4. Roteamento e Navegação

### `routes.tsx`
Nova rota protegida:
```tsx
<Route path="/meus-pdbs" element={
  <RotaProtegida>
    <PdbFilesPage pdbFilesUseCase={pdbFilesUseCase} />
  </RotaProtegida>
} />
```

### Navbar / Menu
Adicionar item de menu: **"Meus PDBs"** com link para `/meus-pdbs`.  
Checar qual componente Navbar é reutilizado nas outras telas e adicionar lá.

---

## 5. Ordem de implementação sugerida

```
1. services/download.py           ← backend: queries SQL
2. usecases/download.py           ← backend: orquestração
3. routes/download.py (patch)     ← backend: 2 novas rotas
4. domain/models/pdb_files.model.ts
5. domain/interfaces/pdb_files.interface.ts
6. data/adapters/pdb_files.adapter.ts
7. data/usecases/pdb_files.usecase.ts
8. container.ts (patch)
9. components/pdb_files/PdbFileCard.tsx
10. templates/pdb_files/PdbFilesTemplate.tsx
11. pages/PdbFilesPage/usePdbFilesPage.ts
12. pages/PdbFilesPage/PdbFilesPage.tsx
13. routes.tsx (patch)
14. Navbar (patch) — adicionar item de menu
```

---

## 6. Pontos a confirmar antes de implementar

- [ ] Na exclusão, o arquivo `.pdb` do servidor deve ser removido do disco se **nenhum outro usuário** o referencia? → *Premissa atual: não, é cache compartilhado.*
- [ ] O botão "Abrir" deve usar `navigate('/visualizador/:pdb_id')` e exibir uma mensagem "em breve" ou simplesmente não aparecer ainda?
- [ ] A Navbar existente é um componente separado ou está embutida em cada template?

---

## Arquivos a criar/modificar

| Tipo | Arquivo |
|---|---|
| Criar | `backend/app/services/download.py` |
| Criar | `backend/app/usecases/download.py` |
| Modificar | `backend/app/routes/download.py` |
| Criar | `frontend/src/domain/models/pdb_files.model.ts` |
| Criar | `frontend/src/domain/interfaces/pdb_files.interface.ts` |
| Criar | `frontend/src/data/adapters/pdb_files.adapter.ts` |
| Criar | `frontend/src/data/usecases/pdb_files.usecase.ts` |
| Modificar | `frontend/src/container.ts` |
| Criar | `frontend/src/components/pdb_files/PdbFileCard.tsx` |
| Criar | `frontend/src/templates/pdb_files/PdbFilesTemplate.tsx` |
| Criar | `frontend/src/pages/PdbFilesPage/usePdbFilesPage.ts` |
| Criar | `frontend/src/pages/PdbFilesPage/PdbFilesPage.tsx` |
| Modificar | `frontend/src/routes.tsx` |
| Modificar | Componente Navbar |
