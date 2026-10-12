# DrugHunter Studio — documentação técnica

O **DrugHunter Studio** é uma interface web local que permite a pessoas **não programadoras** executarem o pipeline
de triagem virtual do DrugHunter (biblioteca Python de química computacional) — da busca da
estrutura-alvo no PDB até a dinâmica molecular — sem escrever código.

Esta documentação descreve **o que o sistema é, como é construído, como os dados fluem e como foi validado**. Ela foi
escrita a partir da leitura do código-fonte (backend, frontend e DrugHunter) e cada afirmação técnica aponta para o
arquivo de origem sempre que possível.

!!! info "Estado do levantamento"
    Documentação baseada na análise **estática** do código da branch `develop` (versão da API 4.0.0).
    Nada foi executado para produzi-la; pontos que dependem de execução estão marcados como **a confirmar**.

## Como navegar

| Se você quer… | Leia |
|---|---|
| Entender o problema, o escopo e os requisitos | [Visão geral](01-visao-geral.md) |
| Ver a arquitetura (C4, camadas, implantação) | [Arquitetura](02-arquitetura.md) |
| Ver o banco de dados (ER e dicionário) | [Modelo de dados](03-modelo-de-dados.md) |
| Entender cada módulo e como se relacionam | [Fluxos e módulos](04-fluxos-e-modulos.md) |
| Saber o que vem do DrugHunter e o que é do Studio | [Integração](05-integracao-drughunter.md) |
| Ver telas, rotas e gráficos | [Frontend](06-frontend.md) |
| Consultar endpoints | [API REST](07-api.md) |
| Instalar, configurar, avaliar segurança | [Implantação e segurança](08-implantacao-e-seguranca.md) |
| Validar acessibilidade, usabilidade e gráficos | [Validação](10-validacao.md) |
| Pegar as imagens dos diagramas para o artigo | [Figuras para o artigo](15-figuras.md) |

## Como gerar esta documentação

```bash
# 1) site navegável
pip install -r requirements-docs.txt
mkdocs serve            # http://127.0.0.1:8000
mkdocs build            # gera ./site

# 2) imagens dos diagramas (PNG 300 dpi + SVG) — fontes em docs/diagramas/src
cd tools/docs && npm install && bash render-diagramas.sh
```

Os diagramas são **código** (Mermaid), versionados junto com o projeto. Para alterar um diagrama, edite o `.mmd`
correspondente e rode o passo 2; PNG e SVG são regenerados em `docs/assets/diagramas/`.
