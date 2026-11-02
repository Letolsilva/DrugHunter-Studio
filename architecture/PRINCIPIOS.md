# Princípios do PDB Explorer

> Este arquivo define os princípios arquiteturais e de comportamento do projeto.
> **Antes de qualquer verificação de código, leia este arquivo para entender o contrato que o projeto deve honrar.**

---

## 1. Propósito — Interface, não motor

O PDB Explorer é exclusivamente uma interface e comunicador com o DrugHunter. Sua responsabilidade é:

- **Receber parâmetros** do usuário e repassá-los ao DrugHunter via subprocess.
- **Expor os resultados exatamente como foram gerados**, lendo os arquivos do diretório de saída. Nenhum resultado é transformado, calculado ou enriquecido por este projeto.
- **Nunca re-criar, recalcular ou substituir** saídas que deveriam ter vindo do DrugHunter.

### Regra do banco de dados

O banco de dados é um **vínculo e índice**, não um repositório de resultados.

- Arquivos de resultado (`.out`, `.mol2`, `.pdb`, CSVs gerados pelo DrugHunter etc.) **sempre vivem em diretórios no sistema de arquivos**, nunca como BLOBs no banco.
- O banco armazena apenas: referências (caminhos, chaves), metadados de job (status, timestamps, parâmetros usados), e dados de autenticação/histórico de usuário.
- O banco é consultado **somente quando necessário** — preferência é sempre a leitura direta do arquivo/diretório.

---

## 2. DrugHunter — seguir o fluxo original com fidelidade

**Jamais modificar o código ou os arquivos do DrugHunter.** Qualquer adaptação fica 100% neste projeto.

### Verificação de fidelidade ao fluxo original

Ao construir ou revisar qualquer parte deste projeto que interaja com o DrugHunter, **verificar diretamente nos arquivos do DrugHunter** qual é o fluxo original esperado (ordem de etapas, parâmetros, estrutura de diretórios, arquivos de entrada/saída) e garantir que o PDB Explorer o replica com exatidão — sem pular etapas, sem mudar a ordem, sem alterar parâmetros sem documentar o motivo.

Ao receber um pedido de verificação de qualquer módulo de integração com o DrugHunter:

1. Ler os arquivos relevantes do DrugHunter para identificar o fluxo original.
2. Comparar linha a linha com a implementação deste projeto.
3. Qualquer divergência deve ser reportada à usuária antes de qualquer mudança.

### Desvios conhecidos e justificados

Existem desvios **intencionais e documentados** do comportamento padrão do DrugHunter. São os únicos desvios aceitáveis:

| Desvio | Motivo | Impacto nos resultados | Arquivo afetado |
|---|---|---|---|
| Substituição de `stdin` bloqueante — shim do `sphere_selector` | O `sphere_selector` real do Dock6 aguarda o usuário escolher um cluster via stdin; em servidor não há terminal e o processo travaria. O shim implementa a mesma seleção em Python puro (distância euclidiana ≤ `distance` Å) sem interação. | Nenhum — seleção determinística, saída idêntica ao original | `_dh_consensus_worker.py` função `_install_sphere_selector_shim` |
| `stdin=DEVNULL` no processo worker | O worker é lançado sem terminal; sem DEVNULL o próprio processo e os binários filhos poderiam bloquear lendo stdin do servidor FastAPI. O DH usa `start_new_session=True` internamente, complementando o isolamento. | Nenhum — todos os binários chamados (chimera, obabel, vina, dock6, dms, sphgen, showbox, grid) são não-interativos | `consensus_runner.py` |
| Renomeação de parâmetros do Dock6 v6.13 (`num_scored_conformers` → `num_final_scored_poses`, novo `num_preclustered_conformers`) | Bug upstream no DrugHunter que ainda não atualizou para a nova API do Dock6. Sem o patch o `dock6` encerra com erro nos arquivos `.in` gerados. | Nenhum — corrige falha sem alterar valores calculados | `_dh_consensus_worker.py` função `_fixed_generate_docking_script` |
| Limitador de paralelismo `nprocess` | O DH define `nprocess = os.cpu_count() - 2` (até 14 workers). Com muitos ligantes, isso lança 14 processos `dock6` simultâneos que esgotam a RAM e o OOM killer do Linux encerra o processo. O worker calcula um `nprocess` seguro baseado na RAM disponível (~1,5 GB por processo `dock6`), com mínimo de 1. | Nenhum — cada ligante é processado de forma independente; reduzir concorrência muda apenas o tempo de execução, não os scores | `_dh_consensus_worker.py` função `_safe_nprocess` |
| Patch `Molecule.from_file`: mol2 → sdf via RDKit (MD) | O DrugHunter passa o ligante em `.mol2` para o OpenFF. O OpenFF com toolkit RDKit não consegue ler `.mol2` gerado pelo Dock6 (estereoquímica implícita e campos não-padrão). Interceptamos `Molecule.from_file`: quando o arquivo é `.mol2`, convertemos para `.sdf` com `RDKit.MolFromMol2File` antes que o OpenFF tente ler. Sem esse patch o MD falharia na importação do ligante. Para eliminar o patch: reportar ao time do DrugHunter para converter o ligante para `.sdf` antes de passá-lo ao OpenFF, ou usar `allow_undefined_stereo=True` no toolkit. | Nenhum — a molécula é a mesma, só o formato muda para compatibilidade | `_dh_md_worker.py` patch `_off_from_file_patched` |
| Patch `assign_partial_charges`: AM1-BCC → MMFF94 → Gasteiger fallback (MD) | O DH usa cargas AM1-BCC (via `antechamber`/AmberTools) para parameterizar o ligante no OpenFF. Se `antechamber` não estiver no `$AMBERHOME` ou não estiver instalado, a chamada original falha. Interceptamos `assign_partial_charges`: tenta AM1-BCC → se falhar, usa MMFF94 → se falhar, usa Gasteiger. O usuário recebe aviso no log. A página de Ajuda instrui como instalar o AmberTools. Para eliminar o patch: instalar AmberTools no ambiente conda DH. | Possível — cargas AM1-BCC são as mais precisas. MMFF94 e Gasteiger são aproximações; resultados de energia e trajetória podem diferir ligeiramente. Recomendado para exploração, não publicação | `_dh_md_worker.py` patch `_patched_assign_partial_charges` |
| Patch `subprocess.run`: obabel → RDKit fallback (MD) | O DH chama `obabel -i pdb -o mol` para converter o ligante de PDB para MOL na etapa `prepare_ligand`. Se `obabel` não estiver instalado no env conda, o `.mol` nunca é criado e o MD falha com `OSError`. Interceptamos `subprocess.run`: tentamos obabel nativo primeiro; se o arquivo de saída não for gerado, fazemos a conversão com `RDKit.MolFromPDBFile`. O usuário recebe aviso no log. A página de Ajuda instrui como instalar o Open Babel. Para eliminar o patch: instalar o Open Babel no env conda DH. | Pequenas diferenças possíveis na representação da molécula, sem impacto prático na maioria dos casos | `_dh_md_worker.py` patch `_patched_sp_run` |
| Stub `pkg_resources` (MD) | `pkg_resources` foi removido do stdlib no Python 3.12+ e de versões recentes do `setuptools`. Dependências transitivas do DrugHunter (OpenMM, BioPython) importam `pkg_resources` na inicialização. Injetamos um stub mínimo em `sys.modules` antes de qualquer import do DH. Para eliminar: atualizar o DrugHunter para não depender de `pkg_resources` (usar `importlib.metadata` em vez disso). | Nenhum — o stub apenas satisfaz a importação; nenhuma funcionalidade real de `pkg_resources` é usada pelo fluxo do MD | `_dh_md_worker.py` bloco inicial de `pkg_resources` |
| Remoção do flag `-dr` do `antechamber` (MD) | O OpenFF decide quais flags passar ao `antechamber` com base na versão cacheada. O stub de versão retorna `20.0` para evitar falha de importação, mas se o binário real for de versão mais antiga, flags como `-dr` (adicionado em versões recentes) não são reconhecidos. Removemos `-dr` da lista de argumentos antes de repassar ao binário real. Para eliminar: garantir que a versão real do `antechamber` instalado corresponda à que o OpenFF detectaria naturalmente. | Nenhum — `-dr` é um flag de diagnóstico/depuração, não altera o cálculo de cargas | `_dh_md_worker.py` patch `_patched_sp_run` bloco `antechamber` |
| Detecção de falha silenciosa do MCS (ChEMBL) | O DrugHunter chama `rdFMCS.FindMCS` sem `timeout`. Para alvos com muitas moléculas (ex: >300), um cluster pode ficar grande demais e o cálculo trava; o DH engole a exceção e não gera `maxcomp/*.csv` sem aviso. O worker detecta quais alvos têm `Similarity/*.csv` mas não têm `maxcomp/*.csv` e emite `partial_failure`. O backend expõe `dh_failed_targets` e o frontend exibe aviso em amarelo. Para eliminar: o DrugHunter deve passar `timeout` ao `FindMCS`. Documentado em `MUDANCAS_DRUGHUNTER.md` §3. | Nenhum — MCS/coloração MCC é puramente visual; dados de similaridade e todo o fluxo downstream são gerados normalmente | `_dh_analysis_worker.py`, `usecases/chembl.py`, `ChemblResultsTemplate.tsx` |

### ✅ Estado atual dos desvios — tudo verificado e em ordem

> **Última verificação:** 2026-10-06
>
> Todos os desvios listados acima foram auditados comparando linha a linha o código do DrugHunter (`wrappers/docking.py`, `caad/docking.py`) com nossa implementação. **Nenhum desvio altera resultados científicos** (scores Vina, scores Dock6, Z-score, Min-Max). O consenso produz saída idêntica ao que o DrugHunter produziria rodando diretamente — confirmado empiricamente com 16 ligantes gerando 16 entradas no CSV de resultado.
>
> Se esta seção não estiver atualizada, rode uma nova auditoria antes de assumir que está tudo bem.

### Quando um novo desvio for necessário

Se durante uma verificação ou implementação for identificado que é necessário contornar mais algum comportamento do DrugHunter (novo bug upstream, mudança de API de dependência, etc.):

1. **Alertar a usuária imediatamente** antes de implementar o contorno.
2. Registrar o problema em `Anotações/MUDANCAS_DRUGHUNTER.md` com: descrição do bug, versão afetada, workaround aplicado, e o que o time do DrugHunter precisa corrigir.
3. Só então implementar o workaround no PDB Explorer, com comentário no código explicando o bug, a versão afetada e que deve ser removido quando corrigido upstream.

### Workarounds e monkey-patches

- O patch deve ter um comentário explicando o bug upstream, a versão afetada e que deve ser removido quando corrigido.
- Exemplo atual: `backend/app/infra/external/_dh_consensus_worker.py` — monkey-patch para Dock6 v6.13.

### Documentação de mudanças necessárias no DrugHunter

Manter o arquivo `Anotações/MUDANCAS_DRUGHUNTER.md` com tudo que o outro time precisaria corrigir no DrugHunter para que este projeto funcione sem patches. Esse arquivo é gerado aqui e enviado ao time do DrugHunter.

### Página de Ajuda (`/ajuda`)

Deve conter, de forma detalhada, **tudo que o usuário precisa instalar e configurar** antes de usar o projeto:

- DrugHunter e suas dependências (Dock6, conda env, bson fix etc.)
- Requisitos de sistema operacional
- Configurações de caminho (`DRUG_HUNTER_PATH`)
- Passos de instalação em ordem, com comandos prontos para copiar

---

## 3. Integridade de fluxo — sem arquivos órfãos

A maioria das funcionalidades é um **fluxo encadeado**: cada etapa depende das anteriores e alimenta as seguintes.

### Contrato de re-execução

Quando o usuário re-executa ou apaga uma etapa do fluxo:

1. **Etapas anteriores:** devem permanecer intactas e corretas.
2. **Etapa re-executada:** gera saída fresca, substituindo a anterior completamente.
3. **Etapas posteriores já executadas:** devem ser **invalidadas e apagadas** (ou marcadas como obsoletas e re-geradas automaticamente) antes da nova saída ser aceita.

### Proibição de arquivos fantasma

- **Nunca deixar arquivos de resultado antigos coexistindo com resultados novos** do mesmo job.
- Antes de escrever qualquer saída nova, limpar/apagar a saída anterior correspondente.
- Jobs no banco que referenciam diretórios inexistentes devem ser detectados e marcados como inválidos, não ignorados silenciosamente.

### Verificação no carregamento

Ao carregar resultados de um job, verificar se os arquivos referenciados ainda existem. Se não existirem, informar o usuário claramente em vez de mostrar tela vazia ou erro genérico.

---

## 4. Portabilidade — funciona em qualquer máquina

O projeto é buildado como instalador (`.deb` / `.exe`) e distribuído para múltiplos usuários. **Nunca assumir nada do ambiente de desenvolvimento.**

### Caminhos

- **Nenhum caminho hardcoded.** Todos os caminhos derivam de:
  - A variável configurável `DRUG_HUNTER_PATH` definida pelo usuário em Configurações.
  - O diretório home/dados do usuário atual (obtido em runtime via `pathlib.Path.home()` ou equivalente).
  - Variáveis de ambiente padrão do sistema operacional.
- Usar `pathlib.Path` (Python) e APIs nativas (JS/TS) para montagem de caminhos — nunca concatenação de strings com `/` ou `\`.
- Diretórios de trabalho, arquivos temporários e arquivos de resultado devem sempre ser relativos ao contexto do usuário ou ao `DRUG_HUNTER_PATH` configurado.

### Configuração zero para o usuário final

- **Email e notificações:** pré-configurados no build. O usuário que recebe o instalador não deve precisar configurar SMTP. As credenciais e configurações são embutidas no build pela equipe de desenvolvimento.
- **Banco de dados:** inicializado automaticamente na primeira execução. Nenhuma etapa manual de criação de schema.
- **Dependências de sistema:** tudo que não for do instalador deve estar na página de Ajuda (`/ajuda`), com instruções claras e comandos prontos.

### Independência de plataforma

- Tratar diferenças de path entre Linux e Windows explicitamente onde existirem.
- Testar o build em máquina limpa (sem o ambiente de desenvolvimento) antes de entregar.

---

## 5. Arquitetura — limites que não devem ser cruzados

Estes limites já estão documentados em `Anotações/arquitetura-backend.md` e `Anotações/arquitetura-frontend.md`. São reforçados aqui como princípios de verificação:

### Backend (hexagonal)

- `routes/` → delega para `usecases/`. Nenhuma lógica de negócio em routes.
- `usecases/` → nunca importa `fastapi`, `Request`, ou `Response`.
- `domain/models/` → zero dependências externas ao `domain/`.
- `services/` → acesso a dados. Não conhece HTTP.
- Workers do DrugHunter (`_dh_*_worker.py`) → rodam dentro do conda env do DrugHunter via subprocess. Isolados do resto do backend.

### Frontend (clean architecture)

- `container.ts` → único lugar com `new ClassName()`. Nenhuma outra arquivo instancia use cases ou serviços.
- Templates → puramente presentacionais. Sem chamadas de API, sem leitura de contexto global.
- Nenhuma cor hardcoded — sempre via CSS variables (`--accent`, `--card`, `--bg`, etc.).
- TypeScript strict: sem `any`, sem nulls implícitos.

---

## 6. O que este projeto NÃO faz

Para evitar scope creep durante revisões:

- **Não processa dados biológicos** — isso é trabalho do DrugHunter.
- **Não armazena arquivos de resultado** no banco de dados.
- **Não modifica** o DrugHunter, o Dock6, ou qualquer ferramenta externa.
- **Não re-implementa** nenhuma análise que o DrugHunter já faz.
- **Não adiciona** lógica de negócio nas camadas erradas da arquitetura.
- **Não assume** caminhos absolutos do ambiente de desenvolvimento.

---

## Como usar este arquivo em verificações

Ao receber um pedido de revisão ou implementação, considere cada seção acima como uma checklist:

1. A mudança respeita o papel de interface/comunicador? (§1)
2. Está modificando algo no DrugHunter ou deixando workarounds sem documentação? (§2)
3. A mudança pode deixar arquivos órfãos ou quebrar etapas subsequentes do fluxo? (§3)
4. Existem caminhos hardcoded ou configurações que impedem rodar em outra máquina? (§4)
5. Algum limite arquitetural foi cruzado? (§5)
6. A mudança está adicionando algo que este projeto não deveria fazer? (§6)
