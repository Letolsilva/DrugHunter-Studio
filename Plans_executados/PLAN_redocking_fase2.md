# PLAN — Redocking Fase 2 — Dashboards do CSV

> Status: **EM EXECUÇÃO**  
> Data: 12/04/2026

---

## Objetivo

Adicionar uma seção de dashboard na página `/redocking` que exibe gráficos e estatísticas
calculados **no frontend** a partir das linhas do `pdb_codes.csv` importado.
Zero mudanças no backend.

---

## Dados disponíveis no CSV

```
PDB_CODE, LIGAND, RESNUM, CHAIN, RESOLUTION
```

---

## Componentes do Dashboard

| # | Componente | Tipo | Dado |
|---|-----------|------|------|
| 1 | Stats row | 4 cards | Total, Ligantes únicos, Resolução média, Cadeias únicas |
| 2 | Distribuição de resolução | `ResolutionBarChart` (reutilizado) | Faixas de Å |
| 3 | Top ligantes | `MethodBarChart` horizontal (reutilizado) | Contagem por LIGAND |
| 4 | Distribuição por cadeia | `MethodBarChart` horizontal (reutilizado) | Contagem por CHAIN |

Todos os gráficos são calculados em `useMemo` dentro do hook — sem estado extra.

---

## Implementação

### 1. Interface + cálculo em `useRedockingPage.ts`

Novo tipo exportado:
```typescript
export interface RedockingDashboard {
  total: number;
  liganteUnicos: number;
  resolucaoMedia: string;
  cadeiaUnicas: number;
  resolucaoFaixas: { name: string; value: number }[];
  topLigantes: { name: string; value: number }[];
  porCadeia: { name: string; value: number }[];
}
```

Calculado com `useMemo` a partir de `csvLinhas`. Exposto no retorno do hook.

### 2. Seção no `RedockingTemplate.tsx`

Aparece entre a tabela CSV e a configuração, somente quando `csvLinhas.length > 0`.
Usa os componentes `ResolutionBarChart` e `MethodBarChart` já existentes.

---

## Layout da seção

```
┌─ Seção 2b: Dashboard das estruturas ─────────────────────────────┐
│                                                                   │
│  [Total]  [Ligantes únicos]  [Resolução média]  [Cadeias únicas] │
│                                                                   │
│  ┌─ Distribuição de resolução ─┐  ┌─ Top ligantes ──────────────┐ │
│  │  ResolutionBarChart         │  │  MethodBarChart (horizontal) │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                   │
│  ┌─ Por cadeia ────────────────────────────────────────────────┐  │
│  │  MethodBarChart (horizontal)                                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## O que NÃO muda

- Nenhuma rota nova
- Nenhum arquivo de backend
- Nenhum novo componente de gráfico — tudo reutilizado
