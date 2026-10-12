# Visualização de dados

## "Como sei que este é o gráfico certo?"

Não existe um gráfico "mais usado" que sirva de justificativa por si só: popularidade não é adequação. O que a
literatura e o mercado aceitam como justificativa é a combinação de **três evidências independentes**:

| # | Evidência | Pergunta que responde | Fonte típica |
|---|---|---|---|
| 1 | **Adequação teórica**: tipo de dado × tarefa do usuário × canal visual | O gráfico codifica o dado com o canal visual mais preciso para essa tarefa? | Teoria de percepção visual e tipologia de tarefas de visualização |
| 2 | **Convenção da área**: o gráfico é o padrão na literatura científica do domínio | Um químico computacional reconhece e confia nesta visualização? | Artigos de referência do método (BOILED-Egg, t-SNE, MD) |
| 3 | **Evidência empírica**: usuários reais interpretam corretamente | As pessoas-alvo extraem a informação certa, rápido e sem erro? | Teste de usabilidade com tarefas de interpretação |

Um gráfico bem defendido tem as três; se a evidência 3 faltar, declare como limitação.

### Método de decisão (passo a passo)

1. **Descreva o dado**: tipo de cada variável — categórica (nominal), ordinal, quantitativa; cardinalidade; quantidade de pontos.
2. **Descreva a tarefa** (o *porquê*): comparar valores, ver distribuição, ver correlação, ver tendência no tempo,
   encontrar agrupamentos/outliers, ver relações (rede), localizar no espaço 3D. Use uma tipologia de tarefas de visualização.
3. **Escolha o canal visual** pela ordem de precisão de percepção: posição em escala comum >
   posição em escalas não alinhadas > comprimento > ângulo/inclinação > área > volume/curvatura > matiz/saturação.
   Prefira codificar a variável mais importante com posição.
4. **Confirme a convenção do domínio** buscando 2–3 artigos que usem a mesma visualização para o mesmo fim.
5. **Verifique acessibilidade e honestidade**: base zero em barras, rótulos de eixo e unidades, cor não é o único canal,
   número de categorias compatível com cores distinguíveis (≈ 8), paleta segura para daltonismo (ex.: Okabe–Ito).
6. **Valide com usuários** (perguntas de interpretação no teste de usabilidade).

### Guia rápido: tarefa → gráfico

| Tarefa | Dado | Gráfico adequado | Evitar |
|---|---|---|---|
| Comparar quantidades entre categorias | 1 categórica + 1 quantitativa | **Barras** (horizontais se rótulos longos), ordenadas | Pizza/donut com muitas fatias |
| Distribuição de uma variável contínua | 1 quantitativa | **Histograma**, boxplot, densidade | Barras com faixas desiguais sem aviso |
| Relação entre duas variáveis | 2 quantitativas | **Dispersão** (com r ou Spearman) | Linhas ligando pontos sem ordem |
| Evolução no tempo | tempo + quantitativa | **Linha** | Barras para séries longas |
| Composição (partes de um todo) | poucas categorias | Barra empilhada ou **pizza só com 2–4 fatias** | Donut com 8 fatias |
| Agrupamentos em alta dimensão | n-dimensional | **Projeção 2D (t-SNE/UMAP/PCA)** com cor por grupo | Interpretar distâncias entre clusters como reais (t-SNE) |
| Relações entre entidades | nós e arestas | **Grafo** (força-dirigido) | Grafo denso sem filtro |
| Estrutura molecular | 3D | **Cartoon/ball-and-stick (NGL)**, 2D para SMILES | — |

## Matriz aplicada ao DrugHunter Studio

| # | Visualização | Dado e tarefa | Tipo | Canal principal | Convenção da área | Adequação | Risco / ajuste recomendado |
|---|---|---|---|---|---|---|---|
| 1 | Resolução por faixa | Nº de estruturas por faixa (Å); ver qualidade do conjunto | Barras verticais | Comprimento, posição | Histograma de resolução é rotina em estudos de PDB | **Adequada** | Faixas de largura desigual (`<1.5`, `1.5–2.0`, `>3.0`, `N/D`): indicar no eixo; manter base zero; cor redundante com a faixa |
| 2 | Método experimental | Contagem por método (top-6) | Barras horizontais | Comprimento | Comum | **Adequada** | Ordenar por valor; informar quando há > 6 métodos (agrupar em "outros") |
| 3 | Estruturas por proteína | Contagem por proteína | Barras | Comprimento | Comum | **Adequada** | — |
| 4 | Ligantes mais frequentes (top-8) | Frequência relativa de ligantes entre as estruturas | **Barras horizontais ordenadas**, com o valor em cada barra | Comprimento | Comum | **Adequada** | Substituiu um donut: o ângulo é um canal pouco preciso e 8 fatias dificultam a comparação (ver nota abaixo) |
| 5 | **BOILED-Egg** (TPSA × WLOGP) | Duas variáveis quantitativas de cada molécula; prever absorção gastrintestinal (HIA) e passagem pela barreira hematoencefálica (BBB) | Dispersão com elipses de referência | Posição (2 eixos) | **Padrão do domínio** | **Muito adequada** | BBB+/BBB− só por vermelho/azul (acrescentar forma); fundo cinza fixo no tema escuro; pontos não focáveis por teclado |
| 6 | **t-SNE por cluster** | Moléculas em espaço de *fingerprint* reduzido a 2D; ver agrupamentos | Dispersão com cor por cluster | Posição + matiz | Projeções 2D (t-SNE/UMAP) são usuais em quimioinformática; **a apresentação segue o padrão do DrugHunter** (decisão do projeto: manter) | **Adequada, com ressalvas** | (a) até 20 clusters excedem as cores distinguíveis (≈ 8) — a legenda interativa mitiga; (b) em t-SNE **as distâncias entre clusters e o tamanho deles não têm significado** — avisar na tela |
| 7 | **Correlação Vina × Dock6** (min-max e z-score) | Dois escores de docking por molécula; ver concordância entre programas | Dispersão (SVG próprio) | Posição | Dispersão é o gráfico canônico de correlação; o DrugHunter gera o mesmo gráfico | **Muito adequada** | Mostrar coeficiente (Pearson/Spearman) e n; manter dois painéis porque as normalizações diferem; só interação por *hover* |
| 8 | Energia total e temperatura (MD) | Série temporal de grandezas físicas; verificar equilíbrio e termostato | *Sparkline* de linha | Posição, inclinação | Séries temporais de energia/T são checagem padrão de MD | **Adequada** | Sem eixos nem unidades no *sparkline* → oferecer a tabela e o gráfico completo (já há abas) |
| 9 | RMSD, RMSF, Rg, ligações de H (PNG do DrugHunter) | RMSD/Rg/H-bonds: série no tempo; RMSF: perfil por resíduo | Linhas / perfil | Posição | **Padrão em análise de MD** (MDAnalysis) | **Muito adequada** | São imagens estáticas com `alt` genérico; sem exportar dados |
| 10 | Trajetória 3D (NGL) | Estrutura 3D do complexo proteína–ligante ao longo do tempo | Cartoon + *licorice* | Forma 3D, cor por cadeia | Representação-padrão; NGL é visualizador consolidado | **Adequada** | Sem alternativa por teclado/descrição |
| 11 | Estrutura 2D (smiles-drawer) | Reconhecer a molécula | Diagrama químico 2D | Forma | Padrão químico | **Adequada** | Canvas sem `aria-label`; incluir o SMILES como texto |
| 12 | Rede de similaridade (PNG) + histograma Tanimoto | Relações entre moléculas por similaridade; maior componente conexo | Grafo força-dirigido + barras | Conexão, posição | Redes moleculares de similaridade usam Fruchterman–Reingold | **Adequada** | Imagem estática, sem interação; legibilidade cai com muitos nós |
| 13 | Curvas de treino (NeuroDock) | Perda × época em treino/validação; detectar *overfitting* | Linhas | Posição | **Padrão em aprendizado de máquina** | **Muito adequada** | Estáticas; legenda e unidades dependem da imagem |
| 14 | Cartões-resumo (KPIs) e tabela | Valores pontuais e consulta | Número, tabela | Texto | Comum | **Adequada** | Tabela densa com texto de 9–11 px |
| 15 | Silhueta no cartão de clustering | Qualidade da separação dos clusters | Número (−1 a 1) | Texto | Coeficiente de silhueta | **Adequada** | Mostrar a **faixa de interpretação** ao lado |

### Resumo da análise

- **14 de 15** visualizações são adequadas ou muito adequadas à tarefa **e** seguem a convenção do domínio.
- **1 adequada com ressalvas**: o t-SNE (nº 6), mantido como está por seguir o padrão do DrugHunter; as ressalvas
  (número de cores e interpretação das distâncias) ficam registradas como limitação de interpretação.
- **Alteração feita durante o trabalho**: o donut de ligantes (nº 4) era inadequado à tarefa e foi **substituído por
  barras horizontais ordenadas** (`LigandBarChart`), com o valor escrito em cada barra.
- Quase todas dependem **só de mouse** e, em parte dos casos, só de cor (BBB+/BBB−, clusters) — pontos de melhoria
  futura listados em [Acessibilidade](11-acessibilidade.md).

!!! info "Escala usada na coluna *Adequação*"
    *Muito adequada*: tarefa, canal visual e convenção alinhados. *Adequada*: correta, com ajustes de legibilidade.
    *Adequada, com ressalvas*: pode induzir interpretação incorreta. *Inadequada*: há um gráfico claramente melhor
    para a mesma tarefa (nenhum gráfico atual está nessa categoria após a substituição do donut).

## Validação empírica (evidência 3)

Inclua no [teste de usabilidade](12-usabilidade.md) perguntas de **interpretação** que só se respondem lendo o gráfico,
com resposta objetivamente certa ou errada:

| Gráfico | Pergunta | Resposta correta |
|---|---|---|
| BOILED-Egg | "Quantas moléculas provavelmente atravessam a barreira hematoencefálica?" | Pontos dentro da elipse amarela (contar/estimar) |
| t-SNE | "Os clusters 2 e 5 são mais parecidos entre si do que os clusters 2 e 7?" | **Não é possível afirmar** (armadilha: distâncias entre clusters no t-SNE não são interpretáveis) |
| Correlação | "Os dois programas concordam sobre o ranking das moléculas?" | Conforme o r exibido |
| RMSD (MD) | "O ligante ficou estável na simulação?" | Platô vs. deriva |
| Resolução | "A maioria das estruturas tem qualidade alta (≤ 2 Å)?" | Conforme as barras |

Registre **acerto** e **tempo** por pergunta. Se o acerto for baixo num gráfico, isso é evidência quantitativa para
trocá-lo — o que também é um resultado válido para o TCC.

## Checklist de qualidade (por gráfico)

- [ ] Título diz o que é mostrado; eixos têm rótulo e **unidade** (Å, kcal/mol, K, kJ/mol).
- [ ] Base zero em barras; escalas comparáveis entre painéis lado a lado.
- [ ] Cor não é o único canal; paleta distinguível por daltônicos; ≤ 8 categorias coloridas.
- [ ] Texto ≥ 12 px e contraste ≥ 4,5:1 (inclusive em eixos e tooltips); funciona nos dois temas.
- [ ] Interação por teclado e alternativa em tabela; `aria-label` descreve o achado principal.
- [ ] Mostra *n* (quantos dados) e a fonte/parâmetro (ex.: fingerprint, métrica de similaridade).
- [ ] Evita enfeites sem informação (razão dados/tinta).
