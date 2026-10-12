# Usabilidade

Definição adotada: **ISO 9241-11** — extensão em que um produto é usado por usuários específicos para atingir
objetivos específicos com **eficácia**, **eficiência** e **satisfação** em um contexto de uso especificado.

Aplicada ao projeto: *"Pesquisadores não programadores conseguem executar o pipeline do DrugHunter pela interface,
com poucas decisões e pouca digitação?"*

## Hipóteses (exemplos)

| ID | Hipótese | Medida |
|---|---|---|
| H1 | Não programadores concluem as tarefas T1–T6 sem ajuda | Taxa de sucesso ≥ 80% por tarefa |
| H2 | O tempo para obter o primeiro resultado é muito menor que via scripts do DrugHunter | Tempo por tarefa vs. linha de base |
| H3 | A satisfação é aceitável | SUS ≥ 68 (média de referência da literatura) |
| H4 | Os usuários interpretam corretamente os gráficos principais | Acerto nas perguntas de interpretação |

## Protocolo do teste

**Participantes.** 5 a 8 pessoas do perfil-alvo (biologia, farmácia, química, bioinformática iniciante), **sem**
experiência com o DrugHunter. Nielsen e Landauer (1993) mostram que ~5 participantes revelam a maior parte dos
problemas de uma interface em testes iterativos; para estimar métricas (tempo, sucesso), mais participantes dão mais
confiança — registre a limitação do tamanho da amostra.

**Ambiente.** Máquina com o Studio e o DrugHunter instalados e **jobs longos pré-executados** (um redocking ou MD
real leva minutos a horas; o teste deve usar resultados prontos nas tarefas de análise e executar ao vivo só o que é
rápido, como a busca PDB).

**Condução** (30–45 min por pessoa):

1. Termo de consentimento e perfil (idade, formação, experiência com bioinformática/terminal).
2. Breve explicação do objetivo (sem demonstrar a interface).
3. Tarefas, com **pensar em voz alta** (*think-aloud*); o facilitador **não ajuda**, apenas registra.
4. Questionário **SUS**.
5. Entrevista curta (o que foi mais difícil? o que faltou?).

**Dados.** Gravação de tela (com consentimento), anotações de erros e hesitações, tempo por tarefa, sucesso
(completou / completou com ajuda / não completou).

## Tarefas (mapeadas aos casos de uso)

| ID | Tarefa (enunciado ao participante) | Caso de uso | Sucesso quando… |
|---|---|---|---|
| T1 | "Encontre estruturas da proteína *[alvo do estudo de caso]* e exporte as de melhor resolução em CSV." | UC02, UC03 | CSV exportado com filtro de resolução |
| T2 | "Escolha uma estrutura com ligante, abra-a e selecione o ligante para o redocking." | UC04, UC05 | Ligante marcado e CSV gerado |
| T3 | "Execute o redocking e diga se o resultado é bom." | UC06 | Interpreta o RMSD corretamente |
| T4 | "Descubra quais moléculas conhecidas atuam nesse alvo e avalie quais atravessam a barreira hematoencefálica." | UC07, UC09 | Identifica as moléculas BBB+ no BOILED-Egg |
| T5 | "Agrupe as moléculas por similaridade e diga quantos grupos há." | UC10 | Informa nº de clusters e silhueta |
| T6 | "Veja o resultado da dinâmica molecular e diga se o ligante ficou estável." | UC14, UC15 | Interpreta RMSD/trajetória |
| T7 | "Descubra por que o job X falhou e o que fazer." | Tratamento de erro | Localiza a mensagem e a ação sugerida |

!!! tip "Linha de base"
    Para sustentar H2 sem recrutar usuários do DrugHunter puro, **você** (ou um especialista) executa as mesmas tarefas
    pelos scripts do DrugHunter e registra o tempo e o número de edições de código necessárias — é uma comparação
    honesta e de baixo custo, declarando que o executor é especialista.

## SUS — System Usability Scale

Dez afirmações, resposta de 1 (discordo totalmente) a 5 (concordo totalmente) — Brooke (1996). Tradução livre abaixo;
para publicação, prefira uma **versão em português validada** (há adaptações brasileiras publicadas — verifique e cite).

1. Acho que gostaria de usar este sistema com frequência.
2. Achei o sistema desnecessariamente complexo.
3. Achei o sistema fácil de usar.
4. Acho que precisaria de ajuda de uma pessoa técnica para usar este sistema.
5. Achei que as várias funções do sistema estavam bem integradas.
6. Achei que havia inconsistência demais neste sistema.
7. Imagino que a maioria das pessoas aprenderia a usar este sistema rapidamente.
8. Achei o sistema muito trabalhoso de usar.
9. Senti-me muito confiante ao usar o sistema.
10. Precisei aprender muitas coisas antes de conseguir usar o sistema.

**Cálculo.** Itens ímpares: `resposta − 1`. Itens pares: `5 − resposta`. Soma dos dez valores × 2,5 → pontuação de
0 a 100. A média de referência na literatura é ≈ 68; acima de ≈ 80 costuma ser interpretada como "excelente"
(Bangor et al., 2008). **SUS não é percentual**: reporte como pontuação, com média e desvio padrão.

```python
def sus(respostas):          # lista de 10 inteiros 1..5, na ordem dos itens
    imp = sum(r - 1 for r in respostas[0::2])
    par = sum(5 - r for r in respostas[1::2])
    return (imp + par) * 2.5
```

## Avaliação heurística (preliminar, derivada da leitura do código)

Feita por inspeção, sem usuários, com as 10 heurísticas de Nielsen. É um **ponto de partida** a ser confirmado
navegando pelo sistema (idealmente por 2–3 avaliadores independentes).

| Heurística | Observação | Severidade (0–4, a confirmar) |
|---|---|---|
| 1. Visibilidade do estado | Redocking e a maioria dos jobs mostram só `status` (sem etapa/progresso); erros de rede no polling são silenciosos e o spinner pode girar indefinidamente | 3 |
| 2. Correspondência com o mundo real | Vocabulário técnico (fingerprint, silhueta, RMSD, z-score) sem glossário contextual em todas as telas; há `InfoTooltip` em alguns pontos e página `/ajuda` | 2 |
| 3. Controle e liberdade | **Não é possível cancelar nem pausar jobs**; `DELETE` não interrompe o processo | 4 |
| 4. Consistência e padrões | Feedback inconsistente (Toast em 4 telas, `alert()` em 2, cartões de erro nas demais); nomes de colunas e fluxos variam entre módulos | 2 |
| 5. Prevenção de erros | Pré-requisitos entre etapas validados no backend (ex.: ADMET exige ChEMBL concluído); **consenso não valida redocking** prévio | 2 |
| 6. Reconhecimento em vez de memorização | Pré-preenchimento entre etapas e valores padrão (redocking) reduzem digitação | 1 |
| 7. Flexibilidade e eficiência | Atalho Ctrl+Enter na busca; filtros e download em lote | 1 |
| 8. Design estético e minimalista | Muitos textos de 8–11 px em tabelas densas | 2 |
| 9. Ajuda a diagnosticar e corrigir erros | Mensagens de erro vêm do backend/DrugHunter (`error_msg`), por vezes técnicas; há "Tentar novamente" e validação do ambiente em `/ajuda` | 2 |
| 10. Ajuda e documentação | Página `/ajuda` com FAQ e instalação (≈1000 linhas) | 1 |

## Ética em pesquisa

Teste com pessoas é pesquisa com seres humanos. No Brasil, consulte o **orientador e o CEP da instituição** sobre a
necessidade de submissão (Resoluções CNS 466/2012 e 510/2016 — esta última dispensa certos tipos de pesquisa de
opinião sem identificação dos participantes). Em qualquer caso: **TCLE** (termo de consentimento), dados anônimos,
direito de desistir e armazenamento seguro das gravações.

## Como relatar

- Tabela por tarefa: sucesso (%), tempo médio ± desvio, erros por participante.
- Pontuação SUS: média, desvio, mínimo e máximo.
- Lista priorizada de problemas: descrição, tarefa, frequência (quantos participantes), severidade (0–4), correção.
- Citações curtas dos participantes (anonimizadas).
- **Ameaças à validade**: amostra pequena, participantes recrutados por conveniência, ambiente controlado, jobs
  pré-executados.
