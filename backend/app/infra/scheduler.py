"""
Infra — Scheduler de limpeza automática de TTL

Roda em background via asyncio ao iniciar o servidor.
Frequência: a cada 24 horas.
"""

import asyncio
import logging
from datetime import datetime

logger = logging.getLogger("drughunter_studio.scheduler")


async def tarefa_limpeza_ttl():
    """
    Loop infinito que executa a limpeza de proteínas expiradas
    uma vez por dia enquanto o servidor estiver rodando.
    """
    await asyncio.sleep(60)  # aguarda o servidor estar pronto

    while True:
        try:
            from app.infra.db.database import SessionLocal, get_config
            from app.services.admin import limpar_proteinas_expiradas
            from app.services.auth import limpar_historico_antigo

            db = SessionLocal()
            try:
                limpeza_ativa = get_config(db, "limpeza_automatica", "true")
                if limpeza_ativa.lower() == "true":
                    resultado = limpar_proteinas_expiradas(db)
                    if resultado["removidas"] > 0:
                        logger.info(
                            f"[TTL] Limpeza automática: {resultado['removidas']} "
                            f"proteínas removidas (TTL={resultado['ttl_dias']} dias)"
                        )
                    else:
                        logger.debug("[TTL] Nenhuma proteína expirada encontrada.")

                n_hist = limpar_historico_antigo(db)
                if n_hist > 0:
                    logger.info(f"[TTL] Histórico: {n_hist} buscas antigas removidas")
            finally:
                db.close()

        except Exception as exc:
            logger.error(f"[TTL] Erro na limpeza automática: {exc}")

        await asyncio.sleep(24 * 60 * 60)
