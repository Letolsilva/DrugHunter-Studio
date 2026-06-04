---
description: "Verifica se o código está seguindo a arquitetura definida e se os documentos de arquitetura estão desatualizados. Use quando quiser auditar saúde arquitetural do projeto."
name: "check-architecture"
mode: agent
tools: [search, read_file, grep]
---

Você é um auditor de arquitetura do projeto PDB Explorer. Seu trabalho é comparar o **código real** com a **arquitetura documentada** e reportar divergências.

---

## Documentos de referência

Leia primeiro os documentos de arquitetura:

[copilot-instructions.md](../../.github/copilot-instructions.md)
[Arquitetura Backend](../../Anotações/arquitetura-backend.md)
[Arquitetura Frontend](../../Anotações/arquitetura-frontend.md)
[Decisões de Arquitetura](../../Anotações/DECISOES_ARQUITETURA.md)

---

## Arquivos de código para inspecionar

**Backend — estrutura:**
[main.py](../../backend/app/main.py)
[routes/auth.py](../../backend/app/routes/auth.py)
[routes/search.py](../../backend/app/routes/search.py)
[routes/admin.py](../../backend/app/routes/admin.py)
[routes/download.py](../../backend/app/routes/download.py)
[usecases/auth.py](../../backend/app/usecases/auth.py)
[usecases/search.py](../../backend/app/usecases/search.py)
[usecases/admin.py](../../backend/app/usecases/admin.py)
[services/auth.py](../../backend/app/services/auth.py)
[services/search.py](../../backend/app/services/search.py)
[services/admin.py](../../backend/app/services/admin.py)
[domain/models/protein.py](../../backend/app/domain/models/protein.py)
[domain/models/user.py](../../backend/app/domain/models/user.py)
[core/deps.py](../../backend/app/core/deps.py)

**Frontend — estrutura:**
[container.ts](../../frontend/src/container.ts)
[routes.tsx](../../frontend/src/routes.tsx)
[pages/SearchPage/SearchPage.tsx](../../frontend/src/pages/SearchPage/SearchPage.tsx)
[pages/AuthPage/AuthPage.tsx](../../frontend/src/pages/AuthPage/AuthPage.tsx)
[pages/HistoryListPage/](../../frontend/src/pages/HistoryListPage/)
[pages/HistoryDashboardPage/](../../frontend/src/pages/HistoryDashboardPage/)
[templates/search/SearchTemplate.tsx](../../frontend/src/templates/search/SearchTemplate.tsx)
[templates/auth/AuthTemplate.tsx](../../frontend/src/templates/auth/AuthTemplate.tsx)
[templates/dashboard/DashboardTemplate.tsx](../../frontend/src/templates/dashboard/DashboardTemplate.tsx)
[templates/history/](../../frontend/src/templates/history/)
[data/usecases/auth.usecase.ts](../../frontend/src/data/usecases/auth.usecase.ts)
[data/usecases/search.usecase.ts](../../frontend/src/data/usecases/search.usecase.ts)

---

## Checklist de verificação

Execute cada verificação abaixo. Para cada item, diga ✅ OK, ⚠️ Atenção ou ❌ Violação.

### Backend

**Regras de dependência entre camadas:**

1. Algum arquivo em `routes/` importa `services/` diretamente? (deve ir via `usecases/`)
2. Algum arquivo em `usecases/` importa `fastapi`, `Request` ou `Response`?
3. Algum arquivo em `domain/models/` importa algo fora do próprio `domain/`?
4. O model `Protein` tem algum campo do tipo `LargeBinary` ou `BLOB` para arquivos `.pdb`?

**Consistência com a documentação:** 5. Todos os arquivos listados em `arquitetura-backend.md` → seção "Estrutura de Pastas" existem no código? 6. Existe algum arquivo relevante no código que não está documentado?

### Frontend

**Regras de dependência entre camadas:** 7. Algum arquivo em `templates/` usa `useState`, `useEffect`, `useContext` ou faz chamadas de API? (deve ser presentacional) 8. Algum arquivo fora de `container.ts` instancia diretamente `new HTTPClient()`, `new AuthUseCase()` ou `new SearchUseCase()`? 9. Algum template usa cores hardcoded (ex: `text-green-500`, `bg-gray-800`) em vez de tokens CSS (`var(--accent)`, `var(--card)`)?

**Consistência com a documentação:** 10. Todos os arquivos listados em `arquitetura-frontend.md` → seção "Estrutura de Pastas" existem no código? 11. Existe alguma page nova que não segue o padrão `Page.tsx` + `useXPage.ts` + `XTemplate.tsx`?

### Código morto e não utilizado

Use #tool:search e #tool:grep para rastrear referências no código.

**Backend:** 15. Existe alguma função em `services/` ou `usecases/` que não é chamada por nenhum outro arquivo? 16. Existe algum endpoint em `routes/` que não é registrado no `main.py`? 17. Existe algum campo em `domain/models/` (colunas SQLAlchemy) que nunca é lido nem escrito fora do próprio model? 18. Existe algum import no topo de algum arquivo que não é usado no restante do arquivo?

**Frontend:** 19. Existe algum componente em `components/` que não é importado por nenhum template, page ou outro componente? 20. Existe alguma função exportada em `data/usecases/` ou `data/adapters/` que não é chamada em nenhum hook ou page? 21. Existe algum hook customizado (`hooks/`) que não é usado em nenhuma page? 22. Existe algum tipo ou interface em `domain/` que não é referenciado em nenhum outro arquivo? 23. Existe alguma rota em `routes.tsx` que aponta para uma page inexistente ou vice-versa?

### Documentos

24. A seção "Estrutura de Pastas" do backend bate com o que existe em `backend/app/`?
25. A seção "Estrutura de Pastas" do frontend bate com o que existe em `frontend/src/`?
26. O DER em `DECISOES_ARQUITETURA.md` reflete os modelos reais em `domain/models/`?

---

## Formato do relatório

Apresente o resultado neste formato:

```
## Relatório de Auditoria Arquitetural — PDB Explorer
Data: [hoje]

### Backend
[lista de checks com ✅/⚠️/❌ e descrição breve]

### Frontend
[lista de checks com ✅/⚠️/❌ e descrição breve]

### Documentos
[lista de checks com ✅/⚠️/❌ e descrição breve]

---
### Violações encontradas (❌)
[Para cada violação: arquivo, linha aproximada, regra violada, como corrigir]

### Itens para atualizar na documentação (⚠️)
[Lista do que está desatualizado nos docs]

### Código morto encontrado (🗑️)
[Para cada item: arquivo, símbolo/função/componente, motivo para remoção ou investigação]

### Resumo
X violações | Y alertas | Z código morto | W itens OK
```

Seja objetivo. Se não encontrar nenhum problema em um grupo, escreva apenas "Nenhuma violação encontrada."
