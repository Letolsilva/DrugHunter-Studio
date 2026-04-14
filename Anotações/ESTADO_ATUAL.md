# Estado Atual — PDB Explorer

> Atualize este arquivo sempre que pausar ou retomar o desenvolvimento.  
> Última atualização: 12/04/2026 (Redocking Fase 1 concluída; Fase 2 — dashboards do CSV — em andamento)

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
- [x] Tela "Meus PDBs" (`/meus-pdbs`) — grid de cards, exclusão com confirmação, nav no menu de todas as telas
- [x] Visualizador de estruturas PDB (`/visualizador/:pdb_id`) — árvore tri-state ATOM/HETATM, lazy load de linhas raw, seleção acumulada multi-PDB, gera `pdb_codes.csv`
- [x] **Suporte PDBx/mmCIF** — veja `Plans_executados/PLAN_cif_format.md`
  - Fase 1 (download): modal de seleção de formato, rota `/cif/{pdb_id}`, campos CIF no modelo Protein, campo `formato` em UserPdbDownload, filtro por formato na página Meus PDBs
  - Fase 2 (visualizador): parser CIF, rota `/visualizador-cif/:pdb_id`, template idêntico ao legacy

---

## Em andamento

- [ ] **Página de Redocking** (`/redocking`) — veja `Plans_executados/PLAN_redocking_fase2.md`
  - [x] Fase 1 (infraestrutura + tabela + job + status in-app + e-mail): **concluída**
  - [ ] Fase 2 (dashboards do CSV no frontend): **em execução**

---

## Próximos passos (backlog priorizado)

1. **Menu principal** com as opções de módulos

2. **Scraper ChEMBL** (`https://www.ebi.ac.uk/chembl/`) — mesmas informações do PDB

3. **Scraper ZINC** (`https://zinc.docking.org/`) — compostos in stock, drug-like, SMILES

4. **Scraper BioMol** (pegar no repositório do Lucas)

5. **Testar limpeza TTL em 30 dias** (scheduler já implementado, precisa de teste real)

6. **Docker** — empacotamento para produção

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

