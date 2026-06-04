# Instruções Gerais — PDB Explorer

## Linguagem

- **Sempre responda em português brasileiro**, independente do idioma da pergunta.
- Nomes de variáveis, funções e comentários no código podem ficar em português ou inglês conforme o padrão já existente no arquivo que está sendo editado. Não mude o padrão de um arquivo ao editá-lo.

---

## O Projeto

**PDB Explorer** é uma aplicação web full-stack (TCC/PFC) para busca e análise de estruturas proteicas do RCSB PDB. O objetivo é permitir que usuários não-programadores explorem dados moleculares — do PDB à dinâmica molecular. O estudo de caso é um fungo.

Stack: **FastAPI (backend) + React 18 + TypeScript + Tailwind CSS v4 (frontend)**.

---

## Regras de Arquitetura — Backend (Hexagonal)

- `routes/` → apenas recebe HTTP e delega para `usecases/`. **Nunca chame `services/` diretamente das rotas.**
- `usecases/` → orquestra a lógica. **Não pode importar `fastapi`, `Request` ou `Response`.**
- `services/` → acesso ao banco via SQLAlchemy. Não conhece HTTP.
- `domain/models/` → entidades puras. **Não importa nada fora do próprio `domain/`.**
- Arquivos `.pdb` **nunca são armazenados como BLOB no banco** — apenas a chave (`pdb_storage_key`) é salva.

## Regras de Arquitetura — Frontend (Clean Architecture)

- **Templates são presentacionais** — recebem props via spread, sem estado e sem chamadas de API.
- **Estado vive em pages/hooks** — pages invocam o hook e passam o resultado como props para o template.
- **Nenhum arquivo faz `new HTTPClient()` ou `new UseCase()` diretamente**, exceto `container.ts`.
- Estilização usa **Tailwind CSS v4 com tokens CSS** (`var(--accent)`, `var(--card)`, etc.). Não use valores hardcoded de cor.

---

## Convenções de Código

- Não adicione docstrings, comentários ou type annotations em código que você não modificou.
- Não crie helpers ou abstrações para operações que acontecem apenas uma vez.
- Não adicione tratamento de erros para cenários impossíveis.
- Não refatore código além do que foi pedido.
- Ao editar um arquivo, mantenha o padrão de estilo já existente nele.

---

## Banco de Dados

- **Dev:** SQLite (arquivo único, sem configuração)
- **Prod:** PostgreSQL — troca feita só via variável de ambiente `DATABASE_URL`, zero mudança de código.
