# Estratégia de validação

Esta seção responde, para o TCC, três perguntas: **o sistema é acessível? é usável por quem não programa? os
gráficos escolhidos são adequados ao que se quer mostrar?** Cada uma tem um método reconhecido, e juntas formam o
protocolo abaixo.

![Metodologia de validação](assets/diagramas/svg/30-metodologia-validacao.svg)
*Figura 30 — Metodologia de validação em quatro fases.*

## Como o mercado faz

| Pergunta | Prática de mercado | Padrão/norma de referência |
|---|---|---|
| Acessibilidade | Auditoria **automática** (axe, Lighthouse) + **manual** (teclado, leitor de tela) + checklist por critério | **WCAG 2.2 nível AA** (W3C); norma europeia EN 301 549; no Brasil, eMAG e a Lei Brasileira de Inclusão (Lei 13.146/2015) |
| Usabilidade | **Teste com usuários** (tarefas guiadas, pensar em voz alta), **SUS**, avaliação heurística | **ISO 9241-11** (eficácia, eficiência, satisfação); 10 heurísticas de Nielsen |
| Visualizações | Revisão por **tipologia de tarefa e canal visual**, convenção da área, teste com usuários | Cleveland & McGill (1984), Munzner (2014), Tufte (1983) |
| Qualidade de software em geral | Modelo de qualidade e testes automatizados em CI | **ISO/IEC 25010** (usabilidade, acessibilidade, manutenibilidade etc.) |

!!! tip "Cobertura que costuma ser exigida em banca"
    Ferramentas automáticas detectam só **uma parte** dos problemas de acessibilidade: a literatura e os
    fabricantes citam de ~30% (auditoria do GDS, Reino Unido) a ~57% (Deque, por volume de ocorrências), conforme a
    metodologia. Confira a fonte antes de citar um número. Por isso a auditoria precisa combinar
    automática + manual; apresentar só a nota do Lighthouse é considerado insuficiente.

## Mapa: o que validar, como, e onde está no projeto

| Atributo (ISO/IEC 25010) | Método | Instrumento | Evidência a produzir | Documento |
|---|---|---|---|---|
| Acessibilidade | Auditoria WCAG 2.2 AA | axe, Lighthouse, teclado, NVDA/Orca | Tabela de critérios (passa/falha) antes e depois | [Acessibilidade](11-acessibilidade.md) |
| Usabilidade — eficácia/eficiência | Teste com usuários | Tarefas T1–T6, cronômetro, taxa de sucesso | Média de sucesso e tempo por tarefa | [Usabilidade](12-usabilidade.md) |
| Usabilidade — satisfação | Questionário | **SUS** | Pontuação 0–100 | [Usabilidade](12-usabilidade.md) |
| Adequação funcional das visualizações | Revisão + teste | Matriz dado → gráfico + perguntas no teste | Matriz justificada com referências | [Visualização](13-visualizacao-de-dados.md) |
| Confiabilidade/manutenibilidade | Testes automatizados | pytest, Vitest, Playwright | Relatório de cobertura | [Limitações](14-limitacoes.md) |

## Estado atual (honesto)

- **Não há testes automatizados** no repositório (nem de backend, nem de frontend); só `tsc --strict` no frontend e dois
  scripts manuais (`teste_scraper.py`, `benchmark_busca.py`).
- **Não há** ESLint, Prettier nem CI (`.github/` contém apenas instruções do Copilot).
- A acessibilidade foi **levantada por leitura de código** (esta documentação); falta a medição em navegador.
- Usabilidade e visualizações ainda **não foram avaliadas com usuários**.

Isso não é impeditivo: o TCC pode apresentar essas lacunas como resultado do diagnóstico e, em seguida, a correção e a
nova medição (antes/depois), que é um desenho de estudo forte e de baixo custo.

## Ordem sugerida de execução

1. Rodar a auditoria automática (1 hora) e registrar a linha de base.
2. Corrigir os problemas de maior impacto e menor esforço (rótulos, contraste, diálogos).
3. Reauditar e anexar a comparação antes/depois.
4. Conduzir o teste de usabilidade com 5–8 pessoas (já com a interface corrigida, para que os problemas de
   acessibilidade não mascarem os de usabilidade).
5. Aplicar o SUS ao final de cada sessão.
6. Fechar a matriz de visualizações com as respostas dos participantes.
