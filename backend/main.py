"""
main.py — Application FastAPI principale
Lancer : uvicorn backend.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.database import create_tables
from backend.utils.model_loader import check_models_exist
from backend.api.routes import auth, predict, historique

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation au démarrage."""
    logger.info("Démarrage de l'application…")
    create_tables()
    logger.info("Tables BDD vérifiées/créées.")
    status = check_models_exist()
    manquants = [k for k, v in status.items() if not v]
    if manquants:
        logger.warning("⚠️  Artefacts ML manquants : %s", manquants)
        logger.warning("Lancez les scripts d'entraînement avant d'utiliser /predict")
    else:
        logger.info("✅  Tous les artefacts ML sont présents.")
    yield
    logger.info("Arrêt de l'application.")


app = FastAPI(
    title="IA Santé Mentale — API",
    description="Détection précoce des troubles mentaux par analyse multimodale.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (autoriser le frontend React) ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(historique.router)


@app.get("/health", tags=["Système"])
def health():
    """Health check — vérifie la BDD et les modèles ML."""
    from backend.database.database import engine
    from sqlalchemy import text
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    modeles = check_models_exist()
    return {
        "statut":          "ok" if db_ok else "degradé",
        "modeles":         modeles,
        "base_de_donnees": db_ok,
    }