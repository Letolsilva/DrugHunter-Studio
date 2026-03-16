# Manifesto de Arquitetura — Frontend PDB Explorer

> Última atualização: migração para TypeScript (strict mode)

---

## 1. Tecnologias

| Camada       | Tecnologia                            |
| ------------ | ------------------------------------- |
| UI Framework | React 18                              |
| Linguagem    | TypeScript 5 (strict mode)            |
| Build        | Vite 5 + @vitejs/plugin-react         |
| Estilização  | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Roteamento   | react-router-dom v6                   |
| Gráficos     | Recharts                              |
| HTTP         | Fetch API (via HTTPClient próprio)    |
| Streaming    | Server-Sent Events (EventSource)      |
| Auth         | JWT — access_token + refresh_token    |

---

## 2. Estrutura de Pastas

```
src/
├── main.tsx                  # Entry point — injeta authUseCase no AuthProvider
├── App.tsx                   # Root — renderiza <AppRoutes searchUseCase={...} />
├── container.ts              # Composição de instâncias (único lugar que chama `new`)
├── routes.tsx                # Todas as rotas + RotaProtegida
├── index.css                 # Design tokens CSS + classes globais (btn-primary etc.)
│
├── domain/                   # Contratos e tipos (zero dependências externas)
│   ├── models/
│   │   ├── auth.model.ts     # interfaces: TokensModel, UserModel, RegisterPayloadModel
│   │   └── search.model.ts   # interfaces: PdbResultModel, SearchEventModel; type: SearchEventType
│   └── interfaces/
│       ├── auth.interface.ts  # IAuthUseCase (abstract class: login, register, fetchMe, refreshToken)
│       └── search.interface.ts # ISearchUseCase (abstract class: createStream, adaptEvent, cancelarParcial)
│
├── infra/                    # Implementações de infraestrutura
│   ├── interfaces/
│   │   └── httpClient.interface.ts  # IHTTPClient (abstract class) + HttpConfig + HttpResponse<T>
│   └── http/
│       └── httpClient.ts            # HTTPClient extends IHTTPClient — Fetch API
│
├── data/                     # Implementações dos contratos de domínio
│   ├── usecases/
│   │   ├── auth.usecase.ts    # AuthUseCase extends IAuthUseCase (recebe IHTTPClient)
│   │   └── search.usecase.ts  # SearchUseCase extends ISearchUseCase (recebe IHTTPClient)
│   └── adapters/
│       └── search.adapter.ts  # adaptSearchResult() — normaliza tipos vindos da API
│
├── contexts/
│   └── AuthContext.tsx        # AuthProvider recebe authUseCase injetado via prop
│
├── pages/                    # Thin wrappers: invoca hook → passa props para template
│   ├── AuthPage/
│   │   ├── AuthPage.tsx       # const props = useAuthPage(); return <AuthTemplate {...props} />
│   │   └── useAuthPage.ts     # Estado de modo/form, submit handler, navegação
│   └── SearchPage/
│       ├── SearchPage.tsx     # const props = useSearchPage(searchUseCase); return <SearchTemplate {...props} />
│       └── useSearchPage.ts   # SSE streaming, pause/cancel, progress DOM refs
│
├── templates/                # Renderização completa da página — recebe todas as props via spread
│   ├── auth/
│   │   └── AuthTemplate.tsx   # Layout da tela de login/registro (Tailwind)
│   ├── search/
│   │   └── SearchTemplate.tsx # Navbar, textarea de busca, barra de progresso, fase=resultado (Tailwind)
│   └── dashboard/
│       └── DashboardTemplate.tsx # Filtros, gráficos, tabela, paginação (Tailwind + sub-componentes)
│
└── components/               # Componentes reutilizáveis sem lógica de negócio
    ├── ui/
    │   ├── Button.tsx         # ButtonProps interface; variant: 'primary' | 'ghost'
    │   ├── Badge.tsx          # BadgeProps interface; variant: 'excelente' | 'boa' | ...
    │   ├── Spinner.tsx        # SpinnerProps interface; wrapper da classe global .spinner
    │   └── Card.tsx           # CardProps interface; container com bg-[var(--card)] border rounded-xl
    ├── charts/
    │   ├── QualityPieChart.tsx   # Recharts PieChart para distribuição de qualidade
    │   ├── MethodBarChart.tsx    # Recharts BarChart horizontal para métodos
    │   └── ProteinBarChart.tsx   # Recharts BarChart vertical para proteínas
    └── dashboard/
        ├── Dashboard.tsx         # Re-export de DashboardTemplate (manter compat.)
        ├── StatsRow.tsx          # StatsRowProps; linha de 5 cards de estatísticas
        ├── FiltersBar.tsx        # FiltersBarProps; inputs/selects de filtro + botão Limpar
        ├── ResultsTable.tsx      # ResultsTableProps; tabela PDB com Badge
        └── Pagination.tsx        # PaginationProps; botões Anterior/Próxima
```

---

## 3. Fluxo de Dados

```
main.tsx
  └─ injeta authUseCase → <AuthProvider>
       └─ estado global: user, loading, login(), logout()

App.tsx
  └─ importa searchUseCase de container.ts
       └─ <AppRoutes searchUseCase={...} />
            └─ routes.tsx
                 ├─ /  →  <SearchPage searchUseCase={...} />
                 │          └─ useSearchPage(searchUseCase)
                 │               └─ searchUseCase.createStream()   → EventSource → API SSE
                 │               └─ searchUseCase.cancelarParcial()→ HTTPClient.delete()
                 │               └─ searchUseCase.adaptEvent()    → search.adapter.ts
                 │               retorna props → <SearchTemplate>
                 │                                └─ fase='resultado' → <DashboardTemplate>
                 │
                 └─ /auth →  <AuthPage />
                              └─ useAuthPage()
                                   └─ useAuth() → AuthContext
                                        └─ authUseCase.login() / .register() → HTTPClient.post()
```

---

## 4. Injeção de Dependências

### `src/container.ts`

Único arquivo que instancia classes concretas. Exporta singletons:

```typescript
const httpClient = new HTTPClient();
export const authUseCase = new AuthUseCase(httpClient);
export const searchUseCase = new SearchUseCase(httpClient);
```

### Regra

- Nenhum outro arquivo faz `new HTTPClient()` ou `new AuthUseCase()` diretamente.
- Pages e contexts SEMPRE recebem usecases como prop/parâmetro.
- AuthProvider aceita `authUseCase` via prop com fallback para teste/isolamento.

---

## 5. Convenções de Estilização (Tailwind v4)

### Tokens CSS como valores arbitrários

```jsx
// Correto — usa variável CSS do design system
<div className="bg-[var(--card)] border border-[var(--border)] text-[var(--accent)]">

// Duração personalizada (não existe duration-400 no padrão)
<div className="transition-[width] duration-[400ms]">
```

### Tokens disponíveis (`index.css`)

| Token            | Uso                           |
| ---------------- | ----------------------------- |
| `--bg`           | Fundo principal               |
| `--bg-2`         | Fundo secundário (navbar etc) |
| `--card`         | Superfície de cards           |
| `--card-2`       | Hover/ativo de cards          |
| `--border`       | Borda sutil                   |
| `--border-2`     | Borda mais visível            |
| `--text`         | Texto primário                |
| `--text-2`       | Texto secundário              |
| `--text-3`       | Texto desmutado               |
| `--accent`       | Verde teal (#00d4aa)          |
| `--accent-dim`   | Accent com alpha 12%          |
| `--accent-hover` | Accent escurecido             |
| `--blue`         | Azul (#3b82f6)                |
| `--red`          | Vermelho (#ef4444)            |
| `--yellow`       | Âmbar (#f59e0b)               |

### Classes globais mantidas em `index.css`

- `.btn-primary`, `.btn-ghost` — botões (usados pelo componente `<Button>`)
- `.badge`, `.badge-excelente`, `.badge-boa` etc. — badges (usados pelo componente `<Badge>`)
- `.spinner` — spinner de loading (usado pelo componente `<Spinner>`)
- `.fade-in` — animação de entrada usada por templates
- `input`, `select`, `textarea` — estilos base compartilhados

---

## 6. Contratos entre Camadas

### Page → Hook → Template

```
Page.tsx
  └─ const props = useXPage(optionalUseCase)
       └─ retorna objeto tipado (UseXPageReturn interface)
  └─ return <XTemplate {...props} />   ← spread total, sem lógica

Template.tsx
  └─ recebe props nomeadas via desestruturação tipada (XTemplateProps interface)
  └─ renderiza JSX puro: Tailwind + sub-componentes
  └─ sem estado (exceto DashboardTemplate: filtros locais de UI)
  └─ sem chamadas de API
```

### UseCase → Interface

```typescript
// Contrato (domain/interfaces/)
export abstract class ISearchUseCase {
  abstract createStream(
    proteinas: string,
    token: string,
    forcarNovo?: boolean,
  ): EventSource;
}

// Implementação (data/usecases/)
class SearchUseCase extends ISearchUseCase {
  private httpClient: IHTTPClient;
  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }
  createStream(
    proteinas: string,
    token: string,
    forcarNovo = false,
  ): EventSource {
    /* EventSource real */
  }
}
```

---

## 7. Regras para Novos Componentes

1. **Sempre funcional** — sem class components.
2. **Props sempre tipadas** — definir `interface XProps` acima do componente. Nunca usar `any`.
3. **Sem lógica de negócio** — componentes em `components/` só recebem dados e disparam callbacks.
4. **Props explícitas** — nunca ler de context diretamente dentro de componentes visuais.
5. **Tailwind first** — usar classes Tailwind + tokens `var(--xxx)`. Evitar inline style exceto para valores dinâmicos.
6. **Sem CSS modules** — a decisão de eliminar `.module.css` é permanente.
7. **Named exports** para sub-componentes: `export function Button(...)`. Default export apenas para pages e templates.
8. **strict mode** ativado no `tsconfig.json` — `strictNullChecks`, `noImplicitAny` etc. são obrigatórios.

---

## 8. Convenções TypeScript

### Modelos de domínio — usar `interface`, nunca `type` para objetos

```typescript
// domain/models/
export interface MeuModel {
  id: string;
  valor: number | null; // null explícito quando o backend pode retornar null
}
```

### Interfaces de contrato — usar `abstract class` (permite `extends`)

```typescript
// domain/interfaces/
export abstract class IMeuUseCase {
  abstract metodo(arg: string): Promise<MeuModel>;
}
```

### HTTP genérico — usar generics para tipagem da resposta

```typescript
const resultado = await this.httpClient.get<MeuModel>("/rota", { token });
// resultado.data é MeuModel
```

### Refs de DOM — tipar com elemento correto

```typescript
const barraRef = useRef<HTMLDivElement | null>(null);
const labelRef = useRef<HTMLSpanElement | null>(null);
```

---

## 9. Adicionando uma Nova Página

1. Criar `src/pages/NovaPagina/NovaPagina.tsx` + `useNovaPagina.ts`
   - Sempre definir `interface UseNovaPaginaReturn` no hook
2. Criar `src/templates/novapagina/NovaTemplate.tsx`
   - Sempre definir `interface NovaTemplateProps` acima do componente
3. Se precisar de dados remotos: criar `src/domain/interfaces/nova.interface.ts` e `src/data/usecases/nova.usecase.ts`
4. Registrar instância em `src/container.ts`
5. Adicionar rota em `src/routes.tsx` (protegida ou pública, conforme necessário)
6. Se precisar de componentes visuais próprios: criar em `src/components/novapagina/` com extensão `.tsx`
