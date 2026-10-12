# Acessibilidade

Referência: **WCAG 2.2, nível AA** (W3C, 2023). Para um sistema usado por pesquisadores, o relevante é: operar só pelo
teclado, ter leitura por leitor de tela, contraste suficiente e não depender de cor.

!!! warning "Natureza das evidências"
    Os achados abaixo vêm da **leitura do código** (contagens por *grep*, tokens de cor de `index.css`). Os valores de
    contraste foram **calculados** a partir dos tokens (fórmula WCAG), não medidos no navegador. Cada item deve ser
    **confirmado** com as ferramentas da seção "Como testar".

## O que já existe

- `<html lang="pt-BR">` e `viewport` (`frontend/index.html`).
- Ícones decorativos com `aria-hidden="true"`.
- `InfoTooltip`: botão com `aria-label` e `role="tooltip"`, acessível por teclado (`components/ui/InfoTooltip.tsx`).
- Chaves de configuração com `role="switch"` e `aria-checked`; grupo de tema com `role="group"`.
- Tema claro/escuro por tokens CSS, com persistência.
- `Escape` fecha alguns modais (`ConfirmModal`, correlação do consenso, modais da MD).
- `alt` em imagens de gráficos (genérico em vários casos).

## Auditoria por critério WCAG 2.2

Legenda: **Falha** · **Parcial** · **Passa** · **A verificar**.

| Critério | Nível | Situação | Evidência no código |
|---|---|---|---|
| 1.1.1 Conteúdo não textual | A | **Falha** | Gráficos Recharts/SVG sem `role="img"`, `aria-label` ou tabela alternativa; canvases do smiles-drawer sem texto; `alt` genéricos ("Gráfico 1") |
| 1.3.1 Informações e relações | A | **Falha** | `FormField.tsx:34-36`: `<label>` irmão do `<input>`, **sem `htmlFor`/`id`** (0 ocorrências de `htmlFor` no projeto; ~30 `<label>` e ~74 `<input>`) |
| 1.4.1 Uso de cor | A | **Parcial** | BBB+/BBB− por vermelho/azul; 20 clusters por paleta tab10; toast verde/vermelho com ícone de 11 px |
| 1.4.3 Contraste (mínimo) | AA | **Falha** | Tema escuro: `foreground-subtle #4a6080` sobre `#141c2e` = **2,65:1** (e 3,0:1 sobre `#0a0e1a`); tema claro: `accent #009e80` como texto sobre `#cedeec` = **2,46:1**; `foreground-subtle` = 4,23:1 (limite 4,5:1). `foreground` e `foreground-muted` passam |
| 1.4.4 / 1.4.12 Redimensionar e espaçamento de texto | AA | **A verificar** | ~172 usos de `text-[8–10px]` e ~237 de `text-[11px]`; base 14 px |
| 1.4.11 Contraste não textual | AA | **A verificar** | Bordas de campos, ícones de estado, elementos de gráfico |
| 1.4.13 Conteúdo em hover/foco | AA | **Falha** | Tooltips do NeuroDock e do Recharts só por `onMouseEnter` |
| 2.1.1 Teclado | A | **Falha** | Pontos do BOILED-Egg (`<circle onClick>`) sem foco; dropdowns próprios (`DropdownSelect`, `MultiSelect`, menus) sem setas/`role`; `div`/`img` com `onClick` |
| 2.1.2 Sem armadilha de teclado | A | **A verificar** | Modais sem *trap* de foco: o foco "vaza" para o fundo |
| 2.2.1 Tempo ajustável | A | **Parcial** | Toast some em 4 s (erros incluídos) |
| 2.3.3 Animação por interação | AAA | **Falha** | Sem `prefers-reduced-motion` |
| 2.4.3 Ordem de foco | A | **Falha** | Modais não movem nem devolvem o foco |
| 2.4.7 Foco visível | AA | **Parcial** | Só `input:focus` tem estilo; ~20 `outline-none`; sem `:focus-visible` global para botões |
| 2.4.11 Foco não obscurecido (2.2) | AA | **A verificar** | Painéis fixos (`GlobalAccumulatedPanel`, indicador de redocking) podem cobrir o foco |
| 2.5.8 Tamanho do alvo (mínimo, 2.2) | AA | **Falha** | `InfoTooltip` 14 px; checkboxes `w-3.5`; mínimo exigido: 24×24 px |
| 3.1.1 Idioma da página | A | **Passa** | `lang="pt-BR"` |
| 3.3.1 / 3.3.3 Identificação e sugestão de erro | A/AA | **Parcial** | `FormField` mostra erro em `<span>` sem `aria-describedby`/`aria-invalid`/`role="alert"`; e-mail do cadastro é `type="text"` |
| 4.1.2 Nome, função, valor | A | **Falha** | 6 modais sem `role="dialog"`/`aria-modal`/`aria-labelledby`; botões de fechar só com ícone (`NetworkModal.tsx:112-118`); dropdowns sem `aria-expanded` |
| 4.1.3 Mensagens de status | AA | **Falha** | `Toast` e barras de progresso sem `role="status"`/`aria-live`/`progressbar`; atualização por manipulação direta do DOM (`useSearchPage.ts`) |

Contagens aproximadas por *grep* em `frontend/src`: ~36 `aria-*` (a maioria `aria-hidden` em ícones), 5 `role=`,
**0** `htmlFor`, **0** `aria-live`, **0** `role="dialog"`, **0** `role="progressbar"`, **0** `sr-only`.

### Problemas adicionais que afetam leitores de tela e usuários em geral

- **Mojibake** (texto com codificação quebrada, p. ex. "GrÃ¡ficos") em `DashboardTemplate.tsx` e `dashboard.adapter.ts`, e "Proteí­na" com hífen suave.
- Gráficos com **cores fixas escuras** (tooltip `#141c2e`, eixos `#4a6080`) mesmo no tema claro.
- O tema **não** segue a preferência do sistema.
- `alert()` nativo em dois pontos.

## Correções recomendadas (priorizadas por impacto × esforço)

| # | Correção | Esforço | Critérios resolvidos |
|---|---|---|---|
| 1 | `FormField`: gerar `id` (`useId`) e ligar `<label htmlFor>`; `aria-invalid`/`aria-describedby` para erro | Baixo (1 componente) | 1.3.1, 3.3.1, 3.3.2 |
| 2 | Escurecer/clarear `foreground-subtle` e `accent`-texto até ≥ 4,5:1 | Baixo (tokens CSS) | 1.4.3 |
| 3 | Criar um componente `Modal` único (`role="dialog"`, `aria-modal`, foco inicial, *trap*, `Escape`, devolver foco) e migrar os 6 modais | Médio | 4.1.2, 2.1.2, 2.4.3 |
| 4 | `Toast` com `role="status"` (e `alert` para erros); barras de progresso com `role="progressbar"` e `aria-valuenow`; `Spinner` com texto oculto | Baixo | 4.1.3 |
| 5 | `:focus-visible` global (anel de 2–3 px) e remover `outline-none` sem substituto | Baixo | 2.4.7 |
| 6 | Alvos ≥ 24 px (área clicável maior que o ícone) | Baixo | 2.5.8 |
| 7 | Gráficos: `role="img"` + `aria-label` resumindo o dado, **tabela de dados alternativa** (alternar "ver como tabela"); ponto do BOILED-Egg focável | Médio | 1.1.1, 2.1.1 |
| 8 | Diferenciar BBB+/BBB− também por **forma** (círculo/triângulo); paleta de clusters daltônico-segura (Okabe–Ito) e rótulos diretos | Baixo | 1.4.1 |
| 9 | `prefers-reduced-motion` e `prefers-color-scheme` | Baixo | 2.3.3 |
| 10 | Tooltips por foco além de hover (e dispensáveis com `Esc`) | Baixo | 1.4.13 |

## Como testar (passo a passo)

### 1. Automático (linha de base)

| Ferramenta | Uso | Observação |
|---|---|---|
| **axe DevTools** (extensão) | Abrir cada tela → *Scan all of my page* | Padrão de mercado; lista por critério WCAG |
| **Lighthouse** (Chrome DevTools → Accessibility) | Nota 0–100 por tela | Útil como indicador, **não** basta sozinho |
| **WAVE** (extensão) | Visualização dos problemas sobre a página | Ótimo para figuras do artigo |
| **eslint-plugin-jsx-a11y** | Regras estáticas no editor/CI | Pega `label` sem `htmlFor`, `onClick` em `div`… |
| **Colour Contrast Analyser** | Medir pares reais de cor | Confirma os cálculos desta página |

As telas protegidas exigem login; use a extensão no navegador já autenticado, ou o teste automatizado abaixo.

### 2. Automático em CI (opcional, recomendado para a defesa)

```bash
cd frontend && npm i -D @playwright/test @axe-core/playwright
```

```ts
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const telas = ['/busca-pdb', '/redocking', '/chembl', '/configuracoes', '/ajuda'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/e-?mail|usuário/i).fill(process.env.E2E_USER!);
  await page.getByLabel(/senha/i).fill(process.env.E2E_PASS!);
  await page.getByRole('button', { name: /entrar/i }).click();
});

for (const rota of telas) {
  test(`sem violações WCAG AA em ${rota}`, async ({ page }) => {
    await page.goto(rota);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations).toEqual([]);
  });
}
```

!!! note
    `getByLabel` só funciona **depois** da correção nº 1 (rótulos associados) — o próprio teste já comprova o problema.

### 3. Manual (o que as ferramentas não pegam)

1. **Teclado**: desconecte o mouse. Percorra cada fluxo com `Tab`, `Shift+Tab`, `Enter`, `Espaço`, `Esc` e setas. O foco
   é sempre visível? Há ordem lógica? Dá para fechar modais e voltar ao ponto de origem?
2. **Leitor de tela**: NVDA (Windows, gratuito) ou Orca (Linux). Ouça: o campo "Proteína" é anunciado com seu
   rótulo? O progresso da busca é anunciado? O erro de um job é anunciado?
3. **Zoom 200% e 400%**: o conteúdo continua utilizável sem rolagem horizontal?
4. **Apenas texto maior** (Chrome → configurações → tamanho da fonte).
5. **Escala de cinza / simulador de daltonismo** (DevTools → Rendering → *Emulate vision deficiencies*): ainda se
   distinguem BBB+/BBB− e os clusters?

### 4. Registro (modelo)

| Tela | Critério | Ferramenta | Antes | Depois | Observação |
|---|---|---|---|---|---|
| /busca-pdb | 1.3.1 | axe | Falha | Passa | `htmlFor` adicionado |

## Declaração de conformidade

Ao final, declare o nível alcançado de forma **honesta e delimitada**: por exemplo, *"conforme com WCAG 2.2 AA nas
telas X, Y, Z; telas A e B não avaliadas"*. Nenhuma ferramenta garante conformidade total, e o escopo declarado é o
que a banca avalia.
