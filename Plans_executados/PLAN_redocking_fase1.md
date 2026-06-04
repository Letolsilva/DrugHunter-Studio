# PLAN — Página de Redocking — Fase 1

> Status: **APROVADO — PRONTO PARA EXECUÇÃO**  
> Data: 12/04/2026

- VISUALIZAR O PDB_codes como tabela 
    - nova paginma com dashboards com as configurações 
    - nessa pagina vai ter o redocking ao clicar no botão 
    - esse botão vai disparar o python que vai ser disponibilizado, esse botão ja vai fazer a chamada de um codigo python
- avisar por email, sms...
- interface de aguardando...
- envio para o codigo o pdb_codes

configurações:
perform_redocking(base_input_path='/datasets/PDB'(onde esta salvo o pdbs),
                      target='MonoamineOxidaseB'(crie uma pasta do alvo terapuetico para os pdbs, ex:glucan synthase),
                      base_output_path='/resultados/redocking'(onde vai ser salvo),
                      prepare_complex=True (padrão, futuramente analisa), charge_type='am1' (am1 - cargas amber, gas - carga gaster. usuario quem decide, qual das duas cargas par ao ligate ))
- pfc 1 vai ate o redocking 
- subvir em um servidor para testes.

---

## Objetivo

Criar a página `/redocking` que permite ao usuário:

1. **Importar** o `pdb_codes.csv` gerado pelo Visualizador
2. **Visualizar** os dados do CSV em uma tabela (mesmo padrão raw do Visualizador)
3. **Configurar e disparar** o script Python de redocking via backend
4. **Acompanhar** o progresso em uma animação de processamento, em qualquer página do site
5. **Ser notificado** ao fim do job: in-app (Toast) + **e-mail** (SMTP)

> **Fase 2** (dashboard com gráficos dos dados do CSV) fica para depois que a Fase 1 estiver funcionando.

---

## Estrutura do `pdb_codes.csv`

```
PDB_CODE,LIGAND,RESNUM,CHAIN,RESOLUTION
5AEZ,MN,502,A,2.1
2H6S,GOL,401,B,1.8
...
```

---

## DECISÕES TÉCNICAS

| # | Tema | Decisão |
|---|------|---------|
| 1 | Onde importar o CSV | **Frontend** — o usuário usa `<input type="file">` ou `showOpenFilePicker`. O CSV é lido em memória no browser e enviado via `POST` para o backend junto com a configuração. |
| 2 | Armazenamento do job | **Nova tabela `redocking_jobs`** no banco. Status: `pending`, `running`, `done`, `error`. |
| 3 | Execução do script | **`subprocess.Popen`** assíncrono no backend, rodando em `BackgroundTasks` do FastAPI. O script externo será chamado como processo Python separado. |
| 4 | Notificação in-app | **Polling** a cada 10 segundos em `GET /api/redocking/jobs/status/{job_id}`. Simples e confiável para jobs longos. |
| 5 | Notificação por e-mail | **`smtplib` + SMTP configurado via variáveis de ambiente** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Não requer bibliotecas externas. |
| 6 | Indicador global | **`GlobalRedockingIndicator`** em `App.tsx` — persiste em todas as rotas. Usa o `RedockingContext` para saber se há job ativo. |
| 7 | `charge_type` | O usuário escolhe entre `am1` (cargas Amber) e `gas` (carga Gasteiger) via radio button. |
| 8 | `prepare_complex` | Fixo em `True` por enquanto (previsto no TODO para análise futura). |
| 9 | Caminho do script Python | Definido via variável de ambiente `REDOCKING_SCRIPT_PATH`. O usuário cola o próprio código `.py` — o backend apenas chama o arquivo com os parâmetros configurados. |
| 10 | E-mail de notificação | **Usa o `usuario.email` já cadastrado** — sem campo extra no form e sem confirmação de e-mail. O backend lê `usuario.email` do token JWT. |

---

## 1. BACKEND

### 1.1 Novo model `domain/models/redocking_job.py`

```python
class RedockingJob(Base):
    __tablename__ = "redocking_jobs"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status          = Column(String, default="pending")  # pending | running | done | error
    target          = Column(String, nullable=False)
    base_input_path = Column(String, nullable=False)
    base_output_path= Column(String, nullable=False)
    charge_type     = Column(String, default="am1")  # am1 | gas
    email_notificacao= Column(String, nullable=True)
    csv_content     = Column(Text, nullable=True)      # conteúdo do CSV salvo para rastreio
    erro_msg        = Column(String, nullable=True)
    iniciado_em     = Column(DateTime, default=datetime.utcnow)
    finalizado_em   = Column(DateTime, nullable=True)
```

**Acrescentar ao `domain/models/__init__.py`:**
```python
from .redocking_job import RedockingJob
```

### 1.2 Novo schema `domain/schemas/redocking.py`

```python
class IniciarRedockingRequest(BaseModel):
    target: str
    base_input_path: str
    base_output_path: str
    charge_type: Literal["am1", "gas"] = "am1"
    csv_content: str                             # conteúdo bruto do CSV

class RedockingJobResponse(BaseModel):
    id: int
    status: str
    target: str
    charge_type: str
    email_notificacao: Optional[str]            # preenchido automaticamente pelo backend com usuario.email
    iniciado_em: datetime
    finalizado_em: Optional[datetime]
    erro_msg: Optional[str]

    model_config = ConfigDict(from_attributes=True)
```

### 1.3 Novo serviço `services/redocking.py`

```python
def criar_job(db, user_id, dados) -> RedockingJob
def atualizar_status(db, job_id, status, erro_msg=None) -> None
def marcar_finalizado(db, job_id, status, erro_msg=None) -> None
def listar_jobs_usuario(db, user_id) -> list[RedockingJob]
def buscar_job(db, job_id, user_id) -> RedockingJob | None
```

### 1.4 Módulo de e-mail `infra/email_sender.py`

```python
# infra/email_sender.py
# Envia e-mail via SMTP usando variáveis de ambiente.
# Se as variáveis não estiverem configuradas, loga um warning e não falha.

def enviar_email_conclusao(
    destinatario: str,
    job_id: int,
    target: str,
    status: str,        # "done" | "error"
    erro_msg: str | None,
) -> None:
    ...
    # Usa smtplib.SMTP_SSL ou SMTP + starttls conforme SMTP_PORT
    # Template de texto simples — sem dependências extras
```

**Variáveis de ambiente necessárias:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_FROM=PDB Explorer <seu_email@gmail.com>
```

> Para Gmail, gerar uma "Senha de App" em myaccount.google.com/apppasswords  
> (autenticação 2 fatores deve estar ativa). Não requer biblioteca externa.

### 1.5 Função de execução em background `infra/redocking_runner.py`

```python
# infra/redocking_runner.py
import subprocess, os
from app.infra.db.database import SessionLocal
from app.services.redocking import atualizar_status, marcar_finalizado
from app.infra.email_sender import enviar_email_conclusao

def executar_redocking_background(
    job_id: int,
    base_input_path: str,
    target: str,
    base_output_path: str,
    charge_type: str,
    email_notificacao: str | None,
    csv_path: str,          # caminho do CSV temporário salvo no servidor
) -> None:
    """Roda como BackgroundTask — abre sessão própria de DB."""
    db = SessionLocal()
    try:
        atualizar_status(db, job_id, "running")

        script = os.getenv("REDOCKING_SCRIPT_PATH", "redocking_stub.py")
        resultado = subprocess.run(
            [
                "python", script,
                "--base_input_path", base_input_path,
                "--target", target,
                "--base_output_path", base_output_path,
                "--charge_type", charge_type,
                "--csv_path", csv_path,
            ],
            capture_output=True,
            text=True,
            timeout=None,           # job pode levar horas
        )

        if resultado.returncode == 0:
            marcar_finalizado(db, job_id, "done")
            if email_notificacao:
                enviar_email_conclusao(email_notificacao, job_id, target, "done", None)
        else:
            erro = resultado.stderr[:1000] or "Erro desconhecido"
            marcar_finalizado(db, job_id, "error", erro)
            if email_notificacao:
                enviar_email_conclusao(email_notificacao, job_id, target, "error", erro)
    except Exception as exc:
        marcar_finalizado(db, job_id, "error", str(exc)[:1000])
        if email_notificacao:
            enviar_email_conclusao(email_notificacao, job_id, target, "error", str(exc))
    finally:
        db.close()
```

### 1.6 Novo router `routes/redocking.py`

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| `POST` | `/api/redocking/iniciar` | obrigatória | Recebe config + CSV, cria job, dispara background task |
| `GET`  | `/api/redocking/jobs` | obrigatória | Lista todos os jobs do usuário |
| `GET`  | `/api/redocking/jobs/status/{job_id}` | obrigatória | Status atual de um job específico |

**`POST /api/redocking/iniciar`:**
```python
@router.post("/iniciar", response_model=RedockingJobResponse)
def iniciar_redocking(
    dados: IniciarRedockingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    # 1. Cria o job no banco (status="pending"), email_notificacao=usuario.email
    # 2. Salva o CSV em arquivo temporário no servidor (ex: /tmp/redocking_{job_id}.csv)
    # 3. Adiciona executar_redocking_background() ao background_tasks
    # 4. Retorna o job criado
```

### 1.7 Registrar no `main.py`

```python
from app.routes.redocking import router as redocking_router
app.include_router(redocking_router)
```
E garantir que `RedockingJob` é importado ao chamar `criar_tabelas()`.

---

## 2. FRONTEND

### 2.1 Domain model `domain/models/redocking.model.ts`

```typescript
export interface RedockingJobModel {
  id: number;
  status: "pending" | "running" | "done" | "error";
  target: string;
  charge_type: "am1" | "gas";
  email_notificacao: string | null;    // e-mail do cadastro — preenchido pelo backend
  iniciado_em: string;
  finalizado_em: string | null;
  erro_msg: string | null;
}

export interface IniciarRedockingPayload {
  target: string;
  base_input_path: string;
  base_output_path: string;
  charge_type: "am1" | "gas";
  csv_content: string;
  // sem email_notificacao — o backend usa usuario.email automaticamente
}
```

### 2.2 Interface `domain/interfaces/redocking.interface.ts`

```typescript
export abstract class IRedockingUseCase {
  abstract iniciar(payload: IniciarRedockingPayload, token: string): Promise<RedockingJobModel>;
  abstract listarJobs(token: string): Promise<RedockingJobModel[]>;
  abstract statusJob(jobId: number, token: string): Promise<RedockingJobModel>;
}
```

### 2.3 Data usecase `data/usecases/redocking.usecase.ts`

Implementa `IRedockingUseCase` via `IHTTPClient` — chamadas a `POST /api/redocking/iniciar`, `GET /api/redocking/jobs`, `GET /api/redocking/jobs/status/:id`.

### 2.4 Contexto global `contexts/RedockingContext.tsx`

```typescript
// Mantém o jobId ativo em memória enquanto o usuário navega entre rotas.
// Faz polling a cada 10s se há job no status pending/running.
// Expõe: activeJob, setActiveJob, clearActiveJob

interface RedockingContextValue {
  activeJob: RedockingJobModel | null;
  setActiveJob: (job: RedockingJobModel) => void;
  clearActiveJob: () => void;
}
```

**Polling:** `useEffect` com `setInterval(10_000)` chamando `redockingUseCase.statusJob()`. Para quando `status === "done"` ou `"error"` — dispara Toast.

### 2.5 `GlobalRedockingIndicator` em `App.tsx`

Componente que lê do `RedockingContext`. Renderiza um indicador flutuante (canto inferior esquerdo) quando há job `pending` ou `running`:

```
┌─────────────────────────────────────┐
│  ⟳ Redocking em andamento...        │
│  Alvo: MonoamineOxidaseB            │
└─────────────────────────────────────┘
```

- Animação: ícone de spinner (reutiliza `<Spinner>`)
- Quando `done`: exibe badge verde "Redocking concluído" por 5s antes de sumir
- Quando `error`: exibe badge vermelho "Erro no redocking" por 5s

### 2.6 Página `pages/RedockingPage/`

```
pages/RedockingPage/
  RedockingPage.tsx        # thin wrapper: const props = useRedockingPage(redockingUseCase); return <RedockingTemplate {...props} />
  useRedockingPage.ts      # estado: arquivo CSV, linhas parseadas, form config, submitting, jobs
```

**Estado no hook:**
```typescript
csvFile: File | null
csvLinhas: CsvLinha[]         // linhas parseadas do CSV: { pdb_code, ligand, resnum, chain, resolution }
config: {
  target: string
  base_input_path: string
  base_output_path: string
  charge_type: "am1" | "gas"
  // sem campo de e-mail — usa o e-mail do cadastro automaticamente
}
submitting: boolean
jobs: RedockingJobModel[]
```

**Ações:**
- `handleImportarCsv(file: File)` — lê o arquivo, parseia CSV, atualiza `csvLinhas`
- `handleSubmit()` — chama `redockingUseCase.iniciar()`, seta `activeJob` no context, adiciona ao `jobs`
- `handleCarregarJobs()` — busca lista de jobs do usuário

### 2.7 Template `templates/redocking/RedockingTemplate.tsx`

**Layout (seguindo o padrão do Visualizador):**

```
┌─ Navbar ──────────────────────────────────────────────────────────────┐
│  ← PDBExplorer  /  Redocking                               [Sair]     │
└───────────────────────────────────────────────────────────────────────┘

┌─ main max-w-[1200px] mx-auto px-8 py-10 ──────────────────────────────┐
│                                                                        │
│  ## Redocking                                                          │
│  Importe o pdb_codes.csv e configure a execução.                      │
│                                                                        │
│  ┌─ Seção 1: Importar CSV ───────────────────────────────────────────┐ │
│  │  [Botão: Importar pdb_codes.csv]                                  │ │
│  │  Ou arraste o arquivo aqui                                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Seção 2: Tabela CSV (só aparece após importar) ─────────────────┐ │
│  │  N estruturas selecionadas                                        │ │
│  │  ┌──────────┬────────┬────────┬───────┬────────────┐             │ │
│  │  │ PDB_CODE │ LIGAND │ RESNUM │ CHAIN │ RESOLUTION │             │ │
│  │  ├──────────┼────────┼────────┼───────┼────────────┤             │ │
│  │  │  5AEZ    │  MN    │  502   │   A   │    2.1     │             │ │
│  │  │  ...     │  ...   │  ...   │  ...  │    ...     │             │ │
│  │  └──────────┴────────┴────────┴───────┴────────────┘             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Seção 3: Configuração do Redocking ─────────────────────────────┐ │
│  │  Alvo terapêutico: [____________]   (ex: GlucanSynthase)         │ │
│  │  Pasta dos PDBs:   [____________]   (ex: /datasets/PDB)          │ │
│  │  Pasta de saída:   [____________]   (ex: /resultados/redocking)  │ │
│  │  Tipo de carga:    ( ) am1 — Amber  ( ) gas — Gasteiger          │ │
│  │  📧 Notificação enviada para: usuario@email.com (do cadastro)    │ │
│  │                                                                   │ │
│  │  [Botão: ▶ Iniciar Redocking]                                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Seção 4: Histórico de Jobs ──────────────────────────────────────┐ │
│  │  # | Alvo | Status | Iniciado | Finalizado | Carga               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

**Estilos:**
- Tabela: `font-mono text-[12px]` igual às linhas raw do Visualizador
- Linhas alternadas: `bg-surface-secondary` / `bg-panel`
- Header da tabela: `text-foreground-subtle text-[11px] uppercase tracking-wide`
- Botão de importar: `variant="ghost"` com ícone de upload
- Botão de iniciar: `btn-primary` (desabilitado se CSV não importado ou campos vazios)

**Animação de processamento (no `GlobalRedockingIndicator`):**
```
background: linear-gradient(
  135deg,
  var(--color-accent-12) 0%,
  var(--color-blue-12) 100%
)
```
Com borda `var(--color-accent-25)` e spinner pulsante. Estilo consistente com `DownloadProgressBar`.

### 2.8 Wiring: container + routes + App

**`container.ts`** — adicionar:
```typescript
import { RedockingUseCase } from "./data/usecases/redocking.usecase";
export const redockingUseCase = new RedockingUseCase(httpClient);
```

**`routes.tsx`** — adicionar:
```tsx
import RedockingPage from "./pages/RedockingPage/RedockingPage";
// ...
<Route path="/redocking" element={<RotaProtegida><RedockingPage redockingUseCase={redockingUseCase} /></RotaProtegida>} />
```

**`App.tsx`** — adicionar `<GlobalRedockingIndicator />` e envolver com `<RedockingProvider>`.

---

## 3. NOTIFICAÇÃO POR E-MAIL

**Template do e-mail (texto simples):**
```
Assunto: [PDB Explorer] Redocking concluído ✓ — <target>

Olá,

O job de redocking do alvo "<target>" (ID: <job_id>) foi concluído com sucesso.

Acesse o PDB Explorer para ver os resultados em: <base_output_path>

—
PDB Explorer
```

Em caso de erro:
```
Assunto: [PDB Explorer] Erro no redocking — <target>

O job de redocking do alvo "<target>" (ID: <job_id>) falhou.

Erro: <erro_msg>
```

---

## 4. SOBRE O SCRIPT DE REDOCKING

O backend vai chamar via `subprocess.run` o arquivo `.py` cujo caminho é definido pela variável de ambiente `REDOCKING_SCRIPT_PATH`. Você vai colar o código do seu script nesse arquivo. O backend passa os seguintes argumentos de linha de comando:

```
python <REDOCKING_SCRIPT_PATH>
  --base_input_path  <valor>
  --target           <valor>
  --base_output_path <valor>
  --charge_type      <am1|gas>
  --csv_path         <caminho do CSV temporário salvo no servidor>
```

**Seu script só precisa aceitar esses argumentos com `argparse` (ou `sys.argv`).** O backend considera sucesso se o código de retorno for `0`, e erro se for diferente de `0` (nesse caso captura o `stderr` como mensagem de erro).

---

## 5. ORDEM DE IMPLEMENTAÇÃO

```
Passo 1 — Backend: model RedockingJob + schema + service
Passo 2 — Backend: infra/email_sender.py + infra/redocking_runner.py
Passo 3 — Backend: routes/redocking.py + registrar em main.py
Passo 4 — Backend: criar redocking_stub.py para dev
Passo 5 — Frontend: domain model + interface + data usecase
Passo 6 — Frontend: RedockingContext + polling
Passo 7 — Frontend: GlobalRedockingIndicator em App.tsx
Passo 8 — Frontend: useRedockingPage + RedockingPage + RedockingTemplate
Passo 9 — Frontend: container.ts + routes.tsx + App.tsx
Passo 10 — Teste ponta-a-ponta com o stub
```

---

## 6. O QUE NÃO ENTRA NA FASE 1

- Dashboards com gráficos dos dados do CSV (Fase 2)
- Suporte a FASTA
- Scrapers ChEMBL / ZINC / BioMol
- Menu principal
- Docker
