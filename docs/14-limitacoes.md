# Limitações e trabalhos futuros

Lista honesta do que foi encontrado na análise do código. Itens com `*` foram observados por leitura estática e
precisam de confirmação em execução.

## Qualidade de software

| # | Achado | Impacto | Sugestão |
|---|---|---|---|
| 1 | Sem testes automatizados, lint e CI | Regressões não detectadas automaticamente | **Fora do escopo deste trabalho** (decisão do projeto); a validação é por acessibilidade, usabilidade e estudo de caso |
| 2 | Sem migrações (Alembic); `create_all` + `_migrate_schema` manual | Evolução de esquema arriscada em bases existentes | Introduzir Alembic |
| 3 | Estados de job como `String` livre | Valor inválido possível | `Enum`/`CHECK`; padronizar nomes (`erro_msg` vs `error_msg`) |
| 4 | Lógica em rotas (download, home, partes de clustering/neurodock) | Viola a arquitetura declarada | Extrair para usecases |
| 5 | Documentação de arquitetura anterior cobria só parte dos módulos (auth, busca, admin) | Documentação enganosa | Substituída por esta documentação |
| 6 | Código morto: `services/api.ts`, `QualityPieChart`, `HistoryListPage` e template | Ruído | Remover |
| 7 | `requirements.txt` não lista `cryptography`/`email-validator` explicitamente | Quebra em instalação limpa* | Fixar dependências |
| 8 | `drughunter_studio.spec` (PyInstaller) exclui `numpy` mas o código usa `pandas`* | Executável PyInstaller possivelmente quebrado (o `.deb` usa venv e não é afetado) | Verificar ou remover o spec |

## Robustez de jobs

| # | Achado | Sugestão |
|---|---|---|
| 9 | Jobs órfãos após reinício só são recuperados em 5 módulos; **redocking, ADMET e análise MD ficam `running`** (o usuário pode usá-los com **Cancelar** para liberar o job) | Rotina de recuperação na inicialização |
| 10 | Erros de rede no *polling* são engolidos, sem limite de tentativas | Contador de falhas + aviso ao usuário |
| 11 | Redocking sem progresso (só `status`) | Emitir etapas como nos demais workers |
| 12 | ChEMBL emite SSE no runner mas o usecase **descarta** (`pass`); docstring da rota cita SSE | Aproveitar os eventos ou remover |
| 13 | `molecules_count` do ChEMBL conta **arquivos** CSV, não moléculas | Contar moléculas únicas |
| 14 | O consenso **não valida** que houve redocking | Aviso/validação opcional |
| 15 | Threads daemon sem fila nem limite de concorrência | Fila de jobs; limite por usuário |

## Funcionalidades previstas e não implementadas

- ADMET a partir de **upload** de CSV (`source_type="upload"` existe no modelo, nunca é criado).
- ZINC (`13-zinc`), filtro DataWarrior (`22`) e SOM do DrugHunter não são expostos.
- Fluxo "refino de *loops*" no Chimera (manual no DrugHunter) é contornado, não substituído.
- Internacionalização: textos fixos em português; sem biblioteca de i18n.

## Segurança

- Token JWT na *query string* (`?token=`) para SSE e imagens.
- `SECRET_KEY` padrão inseguro se a variável não for definida (há aviso).
- `GET /api/chembl/.../plot/{arquivo}` retorna 500 para usuário anônimo*.
- `DELETE /api/search/cancelar-parcial` público e abrangente.

## Interface

- Oportunidades de melhoria de acessibilidade observadas no código (ver [Acessibilidade](11-acessibilidade.md)); a verificação no navegador foi considerada satisfatória.
- Mojibake em textos do dashboard.
- 2 `alert()` nativos; feedback inconsistente.
- t-SNE: número de clusters acima das cores distinguíveis e distâncias entre clusters sem significado (mantido por seguir o padrão do DrugHunter; ver [Visualização](13-visualizacao-de-dados.md)).

## Ameaças à validade do estudo de caso

- Estudo de caso com **um alvo** (fungo escolhido); generalização para outros alvos não foi testada.
- Resultados científicos dependem do DrugHunter e de ferramentas externas, **não verificados** por este trabalho.
- Validação do pipeline pela interface foi feita primeiro para o redocking.

## Trabalhos futuros

1. Fila de jobs com limite de concorrência e notificações em tempo real (SSE/WebSocket) no lugar do *polling*.
2. Assistente de preparação guiada de dados, com valores padrão e detecção/reporte de erros mais claros.
3. Comparação formal do Studio com o uso direto do DrugHunter (tempo e taxa de sucesso por perfil de usuário).
4. Gráficos interativos acessíveis (tabela alternativa, teclado) e exportação de dados.
5. Cancelamento da análise molecular do ChEMBL e recuperação automática de jobs órfãos (redocking, ADMET, análise MD).
