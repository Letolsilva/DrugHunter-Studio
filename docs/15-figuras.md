# Figuras para o artigo

Todas as figuras existem em **PNG (300 dpi, fundo branco)** e **SVG (vetorial)**. Para o artigo, prefira **SVG** (importável
no Word/LibreOffice/Inkscape e no LaTeX via `\includegraphics`) ou o **PNG**. Os arquivos ficam em:

- `docs/assets/diagramas/png/`  — raster, 3× de escala
- `docs/assets/diagramas/svg/`  — vetorial
- `docs/diagramas/src/`          — **código-fonte** dos diagramas (Mermaid `.mmd`)

## Como obter e editar

```bash
cd tools/docs && npm install        # uma vez (usa o Chrome/Chromium do sistema)
bash render-diagramas.sh            # regenera todas as figuras
bash render-diagramas.sh 14-seq-padrao-job   # só uma
```

Para ajustar visualmente, cole o conteúdo de um `.mmd` em <https://mermaid.live>, edite e exporte; depois devolva o
texto ao arquivo para manter o código como fonte única.

!!! tip "Dicas para o artigo"
    - Diagramas largos (ER, sequências) perdem legibilidade em coluna única: use **página inteira** ou rotacione.
    - Se a revista exigir escala de cinza, os diagramas já usam tons neutros; as cores servem só como reforço.
    - Cite a notação na legenda (ex.: "C4, nível 2", "UML de sequência", "ER – pé de galinha").
    - Sugestão de seleção para um artigo curto: **02, 06, 07, 14, 23, 26** (e 12 ou 15 como estudo de caso).

## Catálogo

O **Nº do arquivo** é o prefixo do nome (ordem do catálogo); a numeração das legendas nas páginas do site é sequencial por página e pode diferir. Numere as figuras do artigo conforme a ordem em que aparecem no seu texto.

| Nº do arquivo | Figura | Categoria | Uso sugerido | PNG | SVG |
|---|---|---|---|---|---|
| 01 | Contexto do sistema (C4, nível 1) | Arquitetura | Seção de visão geral / arquitetura | [png](assets/diagramas/png/01-c4-contexto.png) | [svg](assets/diagramas/svg/01-c4-contexto.svg) |
| 02 | Contêineres do sistema (C4, nível 2) | Arquitetura | Arquitetura proposta | [png](assets/diagramas/png/02-c4-containers.png) | [svg](assets/diagramas/svg/02-c4-containers.svg) |
| 03 | Camadas do backend (arquitetura hexagonal) | Arquitetura | Desenvolvimento | [png](assets/diagramas/png/03-backend-hexagonal.png) | [svg](assets/diagramas/svg/03-backend-hexagonal.svg) |
| 04 | Camadas do frontend e injeção de dependência | Arquitetura | Desenvolvimento | [png](assets/diagramas/png/04-frontend-camadas.png) | [svg](assets/diagramas/svg/04-frontend-camadas.svg) |
| 05 | Visões de implantação (dev, Linux, Windows) | Arquitetura | Implantação | [png](assets/diagramas/png/05-implantacao.png) | [svg](assets/diagramas/svg/05-implantacao.svg) |
| 06 | Casos de uso (UML) | Requisitos | Levantamento de requisitos | [png](assets/diagramas/png/06-casos-de-uso.png) | [svg](assets/diagramas/svg/06-casos-de-uso.svg) |
| 07 | Modelo entidade-relacionamento — visão geral | Dados | Modelagem de dados | [png](assets/diagramas/png/07-er-visao-geral.png) | [svg](assets/diagramas/svg/07-er-visao-geral.svg) |
| 08 | ER — usuários, busca e cache de proteínas (com atributos) | Dados | Modelagem de dados | [png](assets/diagramas/png/08-er-busca-pdb.png) | [svg](assets/diagramas/svg/08-er-busca-pdb.svg) |
| 09 | ER — cadeia ChEMBL → ADMET → Clustering/Consenso | Dados | Apêndice | [png](assets/diagramas/png/09-er-pipeline-a.png) | [svg](assets/diagramas/svg/09-er-pipeline-a.svg) |
| 10 | ER — NeuroDock, MD e redocking | Dados | Apêndice | [png](assets/diagramas/png/10-er-pipeline-b.png) | [svg](assets/diagramas/svg/10-er-pipeline-b.svg) |
| 11 | Sequência — autenticação e renovação de token | Comportamento | Apêndice | [png](assets/diagramas/png/11-seq-autenticacao.png) | [svg](assets/diagramas/svg/11-seq-autenticacao.svg) |
| 12 | Sequência — busca de estruturas com SSE e cache | Comportamento | Desenvolvimento | [png](assets/diagramas/png/12-seq-busca-pdb-sse.png) | [svg](assets/diagramas/svg/12-seq-busca-pdb-sse.svg) |
| 13 | Sequência — download e visualizador | Comportamento | Apêndice | [png](assets/diagramas/png/13-seq-download-visualizador.png) | [svg](assets/diagramas/svg/13-seq-download-visualizador.svg) |
| 14 | Sequência — padrão genérico de execução de job | Comportamento | **Principal**: mostra como a GUI aciona o DrugHunter | [png](assets/diagramas/png/14-seq-padrao-job.png) | [svg](assets/diagramas/svg/14-seq-padrao-job.svg) |
| 15 | Sequência — redocking | Comportamento | Estudo de caso | [png](assets/diagramas/png/15-seq-redocking.png) | [svg](assets/diagramas/svg/15-seq-redocking.svg) |
| 16 | Sequência — ChEMBL e análise molecular | Comportamento | Apêndice | [png](assets/diagramas/png/16-seq-chembl.png) | [svg](assets/diagramas/svg/16-seq-chembl.svg) |
| 17 | Sequência — ADMET e clustering | Comportamento | Apêndice | [png](assets/diagramas/png/17-seq-admet-clustering.png) | [svg](assets/diagramas/svg/17-seq-admet-clustering.svg) |
| 18 | Sequência — docking de consenso | Comportamento | Apêndice | [png](assets/diagramas/png/18-seq-consenso.png) | [svg](assets/diagramas/svg/18-seq-consenso.svg) |
| 19 | Sequência — NeuroDock (treino e triagem) | Comportamento | Apêndice | [png](assets/diagramas/png/19-seq-neurodock.png) | [svg](assets/diagramas/svg/19-seq-neurodock.svg) |
| 20 | Sequência — dinâmica molecular e análise | Comportamento | Apêndice | [png](assets/diagramas/png/20-seq-md.png) | [svg](assets/diagramas/svg/20-seq-md.svg) |
| 21 | Estados de um job | Comportamento | Desenvolvimento | [png](assets/diagramas/png/21-estados-job.png) | [svg](assets/diagramas/svg/21-estados-job.svg) |
| 22 | Estados da tela de busca | Comportamento | Apêndice | [png](assets/diagramas/png/22-estados-busca-sse.png) | [svg](assets/diagramas/svg/22-estados-busca-sse.svg) |
| 23 | Pipeline ponta a ponta | Fluxo | **Principal**: visão geral do método | [png](assets/diagramas/png/23-pipeline-ponta-a-ponta.png) | [svg](assets/diagramas/svg/23-pipeline-ponta-a-ponta.svg) |
| 24 | Dependências entre módulos | Fluxo | Desenvolvimento | [png](assets/diagramas/png/24-dependencias-entre-modulos.png) | [svg](assets/diagramas/svg/24-dependencias-entre-modulos.svg) |
| 25 | Estrutura do DrugHunter (workflow e camadas) | Integração | Fundamentação | [png](assets/diagramas/png/25-drughunter-pipeline-original.png) | [svg](assets/diagramas/svg/25-drughunter-pipeline-original.svg) |
| 26 | Mapeamento Studio → DrugHunter | Integração | **Principal**: contribuição do trabalho | [png](assets/diagramas/png/26-mapeamento-studio-drughunter.png) | [svg](assets/diagramas/svg/26-mapeamento-studio-drughunter.svg) |
| 27 | Diagrama de fluxo de dados | Fluxo | Apêndice | [png](assets/diagramas/png/27-dfd-nivel-0-1.png) | [svg](assets/diagramas/svg/27-dfd-nivel-0-1.svg) |
| 28 | Classes do frontend (recorte) | Estrutura | Apêndice | [png](assets/diagramas/png/28-classes-frontend.png) | [svg](assets/diagramas/svg/28-classes-frontend.svg) |
| 29 | Mapa de navegação | Interface | Interface | [png](assets/diagramas/png/29-navegacao-rotas.png) | [svg](assets/diagramas/svg/29-navegacao-rotas.svg) |
| 30 | Metodologia de validação | Método | Metodologia | [png](assets/diagramas/png/30-metodologia-validacao.png) | [svg](assets/diagramas/svg/30-metodologia-validacao.svg) |
| 31 | Sequência — cancelamento de job | Comportamento | Desenvolvimento (controle do usuário sobre o pipeline) | [png](assets/diagramas/png/31-seq-cancelamento.png) | [svg](assets/diagramas/svg/31-seq-cancelamento.svg) |

## Pré-visualização


### Figura 01 — Contexto do sistema (C4, nível 1)

![Contexto do sistema (C4, nível 1)](assets/diagramas/svg/01-c4-contexto.svg)

### Figura 02 — Contêineres do sistema (C4, nível 2)

![Contêineres do sistema (C4, nível 2)](assets/diagramas/svg/02-c4-containers.svg)

### Figura 03 — Camadas do backend (arquitetura hexagonal)

![Camadas do backend (arquitetura hexagonal)](assets/diagramas/svg/03-backend-hexagonal.svg)

### Figura 04 — Camadas do frontend e injeção de dependência

![Camadas do frontend e injeção de dependência](assets/diagramas/svg/04-frontend-camadas.svg)

### Figura 05 — Visões de implantação (dev, Linux, Windows)

![Visões de implantação (dev, Linux, Windows)](assets/diagramas/svg/05-implantacao.svg)

### Figura 06 — Casos de uso (UML)

![Casos de uso (UML)](assets/diagramas/svg/06-casos-de-uso.svg)

### Figura 07 — Modelo entidade-relacionamento — visão geral

![Modelo entidade-relacionamento — visão geral](assets/diagramas/svg/07-er-visao-geral.svg)

### Figura 08 — ER — usuários, busca e cache de proteínas (com atributos)

![ER — usuários, busca e cache de proteínas (com atributos)](assets/diagramas/svg/08-er-busca-pdb.svg)

### Figura 09 — ER — cadeia ChEMBL → ADMET → Clustering/Consenso

![ER — cadeia ChEMBL → ADMET → Clustering/Consenso](assets/diagramas/svg/09-er-pipeline-a.svg)

### Figura 10 — ER — NeuroDock, MD e redocking

![ER — NeuroDock, MD e redocking](assets/diagramas/svg/10-er-pipeline-b.svg)

### Figura 11 — Sequência — autenticação e renovação de token

![Sequência — autenticação e renovação de token](assets/diagramas/svg/11-seq-autenticacao.svg)

### Figura 12 — Sequência — busca de estruturas com SSE e cache

![Sequência — busca de estruturas com SSE e cache](assets/diagramas/svg/12-seq-busca-pdb-sse.svg)

### Figura 13 — Sequência — download e visualizador

![Sequência — download e visualizador](assets/diagramas/svg/13-seq-download-visualizador.svg)

### Figura 14 — Sequência — padrão genérico de execução de job

![Sequência — padrão genérico de execução de job](assets/diagramas/svg/14-seq-padrao-job.svg)

### Figura 15 — Sequência — redocking

![Sequência — redocking](assets/diagramas/svg/15-seq-redocking.svg)

### Figura 16 — Sequência — ChEMBL e análise molecular

![Sequência — ChEMBL e análise molecular](assets/diagramas/svg/16-seq-chembl.svg)

### Figura 17 — Sequência — ADMET e clustering

![Sequência — ADMET e clustering](assets/diagramas/svg/17-seq-admet-clustering.svg)

### Figura 18 — Sequência — docking de consenso

![Sequência — docking de consenso](assets/diagramas/svg/18-seq-consenso.svg)

### Figura 19 — Sequência — NeuroDock (treino e triagem)

![Sequência — NeuroDock (treino e triagem)](assets/diagramas/svg/19-seq-neurodock.svg)

### Figura 20 — Sequência — dinâmica molecular e análise

![Sequência — dinâmica molecular e análise](assets/diagramas/svg/20-seq-md.svg)

### Figura 21 — Estados de um job

![Estados de um job](assets/diagramas/svg/21-estados-job.svg)

### Figura 22 — Estados da tela de busca

![Estados da tela de busca](assets/diagramas/svg/22-estados-busca-sse.svg)

### Figura 23 — Pipeline ponta a ponta

![Pipeline ponta a ponta](assets/diagramas/svg/23-pipeline-ponta-a-ponta.svg)

### Figura 24 — Dependências entre módulos

![Dependências entre módulos](assets/diagramas/svg/24-dependencias-entre-modulos.svg)

### Figura 25 — Estrutura do DrugHunter (workflow e camadas)

![Estrutura do DrugHunter (workflow e camadas)](assets/diagramas/svg/25-drughunter-pipeline-original.svg)

### Figura 26 — Mapeamento Studio → DrugHunter

![Mapeamento Studio → DrugHunter](assets/diagramas/svg/26-mapeamento-studio-drughunter.svg)

### Figura 27 — Diagrama de fluxo de dados

![Diagrama de fluxo de dados](assets/diagramas/svg/27-dfd-nivel-0-1.svg)

### Figura 28 — Classes do frontend (recorte)

![Classes do frontend (recorte)](assets/diagramas/svg/28-classes-frontend.svg)

### Figura 29 — Mapa de navegação

![Mapa de navegação](assets/diagramas/svg/29-navegacao-rotas.svg)

### Figura 30 — Metodologia de validação

![Metodologia de validação](assets/diagramas/svg/30-metodologia-validacao.svg)

### Figura 31 — Sequência — cancelamento de job

![Sequência — cancelamento de job](assets/diagramas/svg/31-seq-cancelamento.svg)
