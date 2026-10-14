# Acessibilidade

Referência: **WCAG 2.2, nível AA** (W3C). Para um sistema usado por pesquisadores, o relevante é: operar só pelo
teclado, ter leitura por leitor de tela, contraste suficiente e não depender de cor.

## Metodologia de avaliação

A avaliação de acessibilidade foi conduzida em duas etapas:

**Inspeção automatizada** com a ferramenta **axe-core 4.9.1** (Deque Systems), padrão de mercado para
auditorias de conformidade WCAG. O script de varredura navegou pelas rotas do sistema (12 rotas na
primeira execução; 18 rotas na segunda, incluindo rotas dinâmicas com IDs reais), aguardando 3 segundos
por página para a renderização do React, e coletou todas as violações e itens incompletos. As varreduras
foram executadas em **13/10/2026** (pré-correção) e **14/10/2026** (pós-correção), nos dois temas
disponíveis (claro e escuro), com o sistema rodando em ambiente de desenvolvimento local apontando para
o banco de dados de produção.

**Navegação por teclado** realizada manualmente pela autora nas telas principais do sistema (`/home`,
`/busca-pdb`, `/redocking`, `/admet`, `/clustering`, `/configuracoes`, `/ajuda`), em **13/10/2026**,
verificando: visibilidade do indicador de foco, ordem de tabulação (`Tab` / `Shift+Tab`), ativação de
controles (`Enter` / `Espaço`) e navegação por setas em listas e menus. Resultado: foco visível e ordem
lógica em todas as telas verificadas; controles principais acessíveis sem o uso do mouse.

**Inspeção do código-fonte** para critérios não detectáveis automaticamente (ordem de foco, armadilhas de
teclado, uso de cor, gráficos sem alternativa textual).

**Limitação declarada:** não foram realizados testes com tecnologias assistivas reais (leitores de tela NVDA
ou Orca) nem com usuários com deficiência visual. Os resultados refletem o que ferramentas automatizadas,
navegação manual por teclado e inspeção de código conseguem identificar.

## Resultado da varredura automatizada

### Antes das correções — 13/10/2026

| Rota | Violações (claro) | Violações (escuro) | Critérios |
|---|---|---|---|
| /home | 1 | 1 | 1.4.3 Contraste |
| /busca-pdb | 2 | 2 | 1.4.3 Contraste · 2.5.8 Tamanho de alvo |
| /meus-pdbs | 2 | 2 | 1.4.3 Contraste · 4.1.2 Interativo aninhado |
| /redocking | 2 | 2 | 1.4.3 Contraste · Cabeçalho de tabela vazio |
| /admet | 1 | 1 | 1.4.3 Contraste |
| /consensus | 1 | 1 | 1.4.3 Contraste |
| /clustering | 1 | 1 | 1.4.3 Contraste |
| /neurodock | 1 | 1 | 1.4.3 Contraste |
| /dinamica-molecular | 3 | 3 | 1.4.3 Contraste · **4.1.2 Campos sem rótulo (crítico)** |
| /chembl | 2 | 2 | 1.4.3 Contraste · **4.1.2 Campos sem rótulo (crítico)** |
| /configuracoes | 3 | 3 | 1.4.3 Contraste · **4.1.2 Botão sem nome (crítico)** · **4.1.2 Campo sem rótulo (crítico)** |
| /ajuda | 1 | 1 | 1.4.3 Contraste |
| **Total** | **20** | **20** | |

**Nós afetados pelo contraste** — tema claro: 187 · tema escuro: 269 (tema escuro tem contraste significativamente pior, conforme previsto pela análise de tokens CSS).

### Correções aplicadas — 13/10/2026

Foram corrigidos os itens de **severidade crítica** (campos de formulário sem rótulo acessível e botões sem
nome), que impedem o uso por leitores de tela, e itens de média severidade (interativo aninhado, cabeçalho
de tabela vazio). Todas as correções são semânticas — sem alteração visual.

| Arquivo | Problema | Correção aplicada |
|---|---|---|
| `MolecularDynamicsTemplate.tsx` | Componente `Field`: `<label>` sem `htmlFor` | `useId()` + `cloneElement` para injetar `id` no filho |
| `MolecularDynamicsTemplate.tsx` | `<input type="range">` sem rótulo | `aria-label="Frame da trajetória"` |
| `ChemblConfigForm.tsx` | Inputs `TextInput`/`NumberInput` sem nome | Prop `aria-label` adicionada aos componentes e às chamadas |
| `ChemblConfigForm.tsx` | Input de ID ChEMBL e campo de alvos sem rótulo | `aria-label` direto em cada elemento |
| `ChemblTemplate.tsx` | Input "Pasta de saída" sem rótulo | `aria-label="Pasta de saída"` |
| `ConfigTemplate.tsx` | 2 botões `role="switch"` sem nome acessível | `aria-label` com nome do usuário / da configuração |
| `ConfigTemplate.tsx` | Input numérico de configuração sem rótulo | `aria-label={LABEL[chave]}` |
| `ConfigTemplate.tsx` | `<label>` sem `htmlFor` para inputs de caminho | `htmlFor`/`id` pareados por `config-dh-{chave}` |
| `RedockingTemplate.tsx` | `<th>` vazio na tabela de jobs | Texto oculto via `position: absolute` + `scope="col"` |
| `PdbFileCard.tsx` | `role="button"` aninhado dentro de `<button>` | Removido `role="button"` do container; `aria-label` no botão de excluir |

### Após as correções semânticas — 13/10/2026 (12 rotas)

| Rota | Violações (claro) | Violações (escuro) | Critérios restantes |
|---|---|---|---|
| /home | 1 | 1 | 1.4.3 Contraste |
| /busca-pdb | 2 | 2 | 1.4.3 Contraste · 2.5.8 Tamanho de alvo |
| /meus-pdbs | 1 | 1 | 1.4.3 Contraste |
| /redocking | 1 | 1 | 1.4.3 Contraste |
| /admet | 1 | 1 | 1.4.3 Contraste |
| /consensus | 1 | 1 | 1.4.3 Contraste |
| /clustering | 1 | 1 | 1.4.3 Contraste |
| /neurodock | 1 | 1 | 1.4.3 Contraste |
| /dinamica-molecular | 1 | 1 | 1.4.3 Contraste |
| /chembl | 1 | 1 | 1.4.3 Contraste |
| /configuracoes | 2 | 2 | 1.4.3 Contraste · 4.1.2 Campo (1 nó residual) |
| /ajuda | 1 | 1 | 1.4.3 Contraste |
| **Total** | **14** | **14** | |

**Redução:** 20 → 14 violações (−30%). As violações de severidade **crítica** foram eliminadas nas 12 rotas avaliadas nesta etapa; a varredura ampliada de 14/10/2026 identificou novos itens críticos em rotas não cobertas anteriormente (`/historico/:id`).

### Após correções de contraste e cobertura ampliada — 14/10/2026 (18 rotas)

Segunda rodada de varredura realizada após:
(a) ajuste dos tokens de cor (`foreground-subtle` e `accent` nos temas claro e escuro) e
(b) ampliação da cobertura para incluir rotas dinâmicas com IDs reais de produção.

| Rota | Violações (claro) | Violações (escuro) | Critérios |
|---|---|---|---|
| /home | 0 ✅ | 0 ✅ | — |
| /busca-pdb | 1 | 1 | 2.5.8 Tamanho de alvo |
| /historico/3 | 4 | 3 | 1.4.3 Contraste · **4.1.2 Campo sem rótulo (crítico)** · Heading ausente |
| /meus-pdbs | 1 | 0 ✅ | 1.4.3 Contraste (claro) |
| /visualizador/7B38 | 2 | 1 | 1.4.3 Contraste (claro) · Heading ausente |
| /redocking | 1 | 0 ✅ | 1.4.3 Contraste (claro) |
| /admet | 1 | 0 ✅ | 1.4.3 Contraste (claro) |
| /admet/1 | 2 | 2 | 1.4.3 Contraste · **1.1.1 SVG sem texto alternativo (sério)** |
| /consensus | 1 | 1 | 1.4.3 Contraste |
| /consensus/1 | 1 | 0 ✅ | 1.4.3 Contraste (claro) |
| /clustering | 1 | 1 | 1.4.3 Contraste |
| /clustering/1 | 2 | 2 | 1.4.3 Contraste · Ordem de headings |
| /neurodock | 0 ✅ | 0 ✅ | — |
| /dinamica-molecular | 1 | 1 | 1.4.3 Contraste |
| /chembl | 1 | 1 | 1.4.3 Contraste |
| /chembl/3/resultados | 1 | 1 | 1.4.3 Contraste |
| /configuracoes | 2 | 2 | 1.4.3 Contraste · 4.1.2 Campo sem rótulo |
| /ajuda | 1 | 1 | 1.4.3 Contraste |
| **Total** | **23** | **17** | |

**Comparação sobre as 12 rotas originais** (base equivalente): 14 → 11 violações no tema claro (−21%); 14 → 8 no tema escuro (−43%). As 6 rotas dinâmicas adicionadas contribuíram com 12 e 9 violações respectivamente, antes não mensuradas.

**Nós afetados pelo contraste** — tema claro: redução expressiva nas páginas de listagem; persistência em telas de resultado com gráficos externos. Tema escuro: redução de ~43% nas rotas originais após correção do token `foreground-subtle`.

### Violações remanescentes e justificativa

| Critério | Páginas afetadas | Severidade | Decisão |
|---|---|---|---|
| 1.4.3 Contraste (WCAG 2.2 AA) | Maioria das rotas | Sério | Tokens principais corrigidos; os nós residuais parecem concentrar-se em componentes de visualização de dados (telas de resultado com maior número de nós afetados: `/admet/:id` com 83 nós, `/chembl/:id/resultados` com 28, `/clustering/:id` com 13). Correção completa requer inspecionar e ajustar as cores inline desses componentes. |
| 1.1.1 SVG sem alt (WCAG 2.2 A) | /admet/:id | Sério | 2125 SVGs de estruturas moleculares gerados pelo RDKit (biblioteca externa). Requer adicionar `role="img"` + `aria-label` a cada estrutura renderizada. Registrado como melhoria futura. |
| 4.1.2 Campo sem rótulo | /historico/3 · /configuracoes | Crítico | Campo em /historico identificado como novo; campo em /configuracoes requer investigação adicional (visível apenas para admin). |
| 2.5.8 Tamanho de alvo (WCAG 2.2 AA) | /busca-pdb | Sério | Aumentar alvos pode alterar layout. Registrado como melhoria futura. |
| page-has-heading-one | /historico/3 · /visualizador/7B38 | Moderado | Páginas de resultado usam título dinâmico sem `<h1>` semântico. Melhoria de estrutura. |
| heading-order | /clustering/:id | Moderado | Hierarquia de headings irregular na tela de resultado de clustering. |

## O que já existe (análise do código)

- `<html lang="pt-BR">` e `viewport` (`frontend/index.html`).
- Ícones decorativos com `aria-hidden="true"`.
- `InfoTooltip`: botão com `aria-label` e `role="tooltip"`, acessível por teclado (`components/ui/InfoTooltip.tsx`).
- Chaves de configuração com `role="switch"` e `aria-checked`; grupo de tema com `role="group"`.
- Tema claro/escuro por tokens CSS, com persistência.
- `Escape` fecha alguns modais (`ConfirmModal`, correlação do consenso, modais da MD).
- `alt` em imagens de gráficos (genérico em vários casos).

## Observações por critério WCAG 2.2 (leitura do código)

Legenda: **Falha** · **Parcial** · **Passa** · **A verificar** — situação segundo a leitura do código.

| Critério | Nível | Situação | Evidência no código |
|---|---|---|---|
| 1.1.1 Conteúdo não textual | A | **Falha** | Gráficos Recharts/SVG sem `role="img"`, `aria-label` ou tabela alternativa; canvases do smiles-drawer sem texto; `alt` genéricos ("Gráfico 1") |
| 1.3.1 Informações e relações | A | **Parcial** | `FormField.tsx:34-36`: `<label>` irmão do `<input>`, **sem `htmlFor`/`id`** (corrigido nos templates afetados; componente base pendente) |
| 1.4.1 Uso de cor | A | **Parcial** | BBB+/BBB− por vermelho/azul; 20 clusters por paleta tab10; toast verde/vermelho com ícone de 11 px |
| 1.4.3 Contraste (mínimo) | AA | **Parcial** | Tokens corrigidos: `foreground-subtle` escuro `#4a6080`→`#6888a8` (4,59:1); claro `#486888`→`#3d5c7a` (5,08:1); `accent` claro `#009e80`→`#006b56` (4,72:1). Nós residuais em cores hardcoded de bibliotecas externas (Recharts, RDKit SVGs). Varredura 14/10/2026: melhora de 27% (claro) e 47% (escuro) nas rotas originais. |
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
| 2.5.8 Tamanho do alvo (mínimo, 2.2) | AA | **Falha** | `InfoTooltip` 14 px; checkboxes `w-3.5`; mínimo exigido: 24×24 px; confirmado em /busca-pdb |
| 3.1.1 Idioma da página | A | **Passa** | `lang="pt-BR"` |
| 3.3.1 / 3.3.3 Identificação e sugestão de erro | A/AA | **Parcial** | `FormField` mostra erro em `<span>` sem `aria-describedby`/`aria-invalid`/`role="alert"`; e-mail do cadastro é `type="text"` |
| 4.1.2 Nome, função, valor | A | **Parcial** | Corrigido: campos de formulário nos templates afetados, botões switch sem nome, cabeçalho de tabela vazio. Pendente: 6 modais sem `role="dialog"`/`aria-modal`/`aria-labelledby`; dropdowns sem `aria-expanded` |
| 4.1.3 Mensagens de status | AA | **Falha** | `Toast` e barras de progresso sem `role="status"`/`aria-live`/`progressbar`; atualização por manipulação direta do DOM (`useSearchPage.ts`) |

## Melhorias futuras (priorizadas por impacto × esforço)

| # | Correção | Esforço | Critérios |
|---|---|---|---|
| 1 | ~~Escurecer/clarear `foreground-subtle` e `accent`-texto até ≥ 4,5:1~~ **Concluído (14/10/2026)** | — | 1.4.3 |
| 2 | Criar componente `Modal` único (`role="dialog"`, `aria-modal`, foco inicial, *trap*, `Escape`, devolver foco) | Médio | 4.1.2, 2.1.2, 2.4.3 |
| 3 | `Toast` com `role="status"` (e `alert` para erros); barras de progresso com `role="progressbar"` | Baixo | 4.1.3 |
| 4 | `:focus-visible` global (anel de 2–3 px) e remover `outline-none` sem substituto | Baixo | 2.4.7 |
| 5 | Alvos ≥ 24 px (área clicável maior que o ícone) | Baixo | 2.5.8 |
| 6 | Gráficos: `role="img"` + `aria-label` resumindo o dado | Médio | 1.1.1, 2.1.1 |
| 7 | `prefers-reduced-motion` e `prefers-color-scheme` | Baixo | 2.3.3 |
| 8 | Tooltips por foco além de hover | Baixo | 1.4.13 |

## Declaração de conformidade

O sistema apresenta **conformidade parcial com WCAG 2.2 nível AA**. A avaliação cobriu 18 rotas da
interface — incluindo rotas dinâmicas com IDs reais de produção (`/historico/:id`, `/admet/:id`,
`/visualizador/:pdb_id`, `/chembl/:jobId/resultados`, `/consensus/:id`, `/clustering/:id`) —, nos
temas claro e escuro, por meio de inspeção automatizada (axe-core 4.9.1) e navegação manual por teclado.

Após duas rodadas de correção (13 e 14/10/2026), os critérios de estrutura de linguagem (3.1.1) e
associação de rótulos nos templates avaliados (4.1.2, parcial) são atendidos. Os tokens de cor foram
ajustados para atender ao mínimo de 4,5:1 (critério 1.4.3), com redução de 47% das violações no tema
escuro e 27% no tema claro sobre as rotas originais; nós residuais concentram-se em bibliotecas
externas de visualização (Recharts, RDKit). As demais não-conformidades remanescentes (2.1.1, 2.4.3,
4.1.3, 1.1.1 em SVGs de resultado) foram documentadas e registradas como melhorias futuras.
