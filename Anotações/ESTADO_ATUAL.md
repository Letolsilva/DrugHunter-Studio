# Estado Atual — PDB Explorer

> Atualize este arquivo sempre que pausar ou retomar o desenvolvimento.  
> Última atualização: 06/04/2026 (Suporte PDBx/mmCIF concluído — Fase 1 e Fase 2)

---

## Branch / Versão

- Branch atual: `main`
- Versão da API: `4.0.0`

---

## O que está funcionando

- [x] Busca de proteínas via SSE (streaming em tempo real)
- [x] Cache inteligente (TTL 30 dias, scheduler automático)
- [x] Histórico de buscas por usuário autenticado
- [x] Autenticação JWT (access + refresh token)
- [x] Download de arquivos `.pdb` em lote (proxy pelo backend + File System Access API)
- [x] Barra de progresso de download (`DownloadProgressBar`)
- [x] Filtro de resolução máxima (Å)
- [x] `ResolutionBarChart` em substituição ao `QualityPieChart`
- [x] Download CSV com `showSaveFilePicker`
- [x] Seleção de lote considera filtros ativos (todas as páginas)
- [x] Painel admin (configs, TTL, usuários)
- [x] Arquitetura frontend migrada para TypeScript strict + container.ts

---

## Em andamento

- [x] Tela "Meus PDBs" (`/meus-pdbs`) — grid de cards, exclusão com confirmação, nav no menu de todas as telas
- [x] Visualizador de estruturas PDB (`/visualizador/:pdb_id`) — árvore tri-state ATOM/HETATM, lazy load de linhas raw, seleção acumulada multi-PDB, gera `pdb_codes.csv`
- [x] **Suporte PDBx/mmCIF** — veja `Plans_executados/PLAN_cif_format.md`
  - Fase 1 (download): modal de seleção de formato, rota `/cif/{pdb_id}`, campos CIF no modelo Protein, campo `formato` em UserPdbDownload, filtro por formato na página Meus PDBs
  - Fase 2 (visualizador): parser CIF, rota `/visualizador-cif/:pdb_id`, template idêntico ao legacy

---

## Próximos passos (backlog priorizado)

1. **Pasta `dataset/`** para organizar downloads

2. **Menu principal** com as opções de módulos

4. **Scraper ChEMBL** (`https://www.ebi.ac.uk/chembl/`) — mesmas informações do PDB

5. **Scraper ZINC** (`https://zinc.docking.org/`) — compostos in stock, drug-like, SMILES

6. **Scraper BioMol** (pegar no repositório do Lucas)

7. **Suporte a FASTA*** — download e escolha de pasta (legacy já funciona para PDB)

8. **Testar limpeza TTL em 30 dias** (scheduler já implementado, precisa de teste real)

9. **Docker** — empacotamento para produção

---

## Arquivos importantes

| Arquivo | Descrição |
|---|---|
| `backend/app/main.py` | Entry point FastAPI |
| `frontend/src/container.ts` | Composição de dependências (único `new`) |
| `frontend/src/routes.tsx` | Todas as rotas do frontend |
| `backend/app/infra/db/database.py` | Engine, sessão, `get_db()` |
| `backend/pdb_files/` | Arquivos `.pdb` e `.cif` salvos no servidor |
| `Plans_executados/PLAN_cif_format.md` | Plano detalhado do suporte PDBx/mmCIF |

---

## Problemas conhecidos / dívidas técnicas

<!-- Anote aqui bugs conhecidos ou débitos técnicos -->

