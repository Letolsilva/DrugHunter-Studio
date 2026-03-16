"""
Scheduler — limpeza automática de TTL
Roda em background via asyncio ao iniciar o servidor.
Frequência: a cada 24h.
"""

import asyncio
import logging
from datetime import datetime

logger = logging.getLogger("pdb_explorer.scheduler")


async def tarefa_limpeza_ttl():
    """
    Loop infinito que executa a limpeza de proteínas expiradas
    uma vez por dia enquanto o servidor estiver rodando.
    """
    # Aguarda 60s antes da primeira execução (servidor precisa estar pronto)
    await asyncio.sleep(60)

    while True:
        try:
            # Importa aqui para evitar circular import
            from app.db.database import SessionLocal, get_config
            from app.services.cache import limpar_proteinas_expiradas

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

                # Limpeza de histórico de buscas com +30 dias
                from app.services.auth import limpar_historico_antigo

                n_hist = limpar_historico_antigo(db)
                if n_hist > 0:
                    logger.info(f"[TTL] Histórico: {n_hist} buscas antigas removidas")
            finally:
                db.close()

        except Exception as e:
            logger.error(f"[TTL] Erro na limpeza automática: {e}")

        # Aguarda 24h para a próxima execução
        await asyncio.sleep(24 * 60 * 60)


def iniciar_scheduler(app):
    """Registra a tarefa de limpeza no loop do FastAPI."""
    import asyncio

    @app.on_event("startup")
    async def startup_scheduler():
        asyncio.create_task(tarefa_limpeza_ttl())
        logger.info("[Scheduler] Limpeza automática de TTL agendada (24h)")
