"""
model_loader.py — Utilitaires centralisés de sauvegarde et chargement des modèles.
Tous les artefacts (modèles, scalers, vectoriseurs) passent par ce module.
Compatible FastAPI : les fonctions sont synchrones et thread-safe (joblib).
"""

import logging
from pathlib import Path
from typing import Any, Optional

import joblib
from backend.utils.config import (

    MODEL_COMP_PATH,
    SCALER_COMP_PATH,
    ENCODER_COMP_PATH,
    FEATURES_COMP_PATH,
    MODEL_NLP_PATH,
    VECTORIZER_NLP_PATH,
    LABEL_ENCODER_NLP,
    FUSION_PARAMS_PATH,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# PRIMITIVES GÉNÉRIQUES
# ─────────────────────────────────────────────────────────────

def save_artifact(obj: Any, path: Path, compress: int = 3) -> None:
    """
    Sauvegarde un artefact (modèle, scaler, encodeur…) avec joblib.

    Args:
        obj:      Objet Python à sérialiser.
        path:     Chemin de destination (Path).
        compress: Niveau de compression joblib (0 = aucun, 9 = max).
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(obj, path, compress=compress)
    logger.info("Artefact sauvegardé : %s", path)


def load_artifact(path: Path) -> Any:
    """
    Charge un artefact depuis le disque.

    Args:
        path: Chemin de l'artefact joblib.

    Returns:
        Objet désérialisé.

    Raises:
        FileNotFoundError: Si le fichier est absent.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Artefact introuvable : {path}. "
            "Lancez d'abord le script d'entraînement correspondant."
        )
    obj = joblib.load(path)
    logger.info("Artefact chargé : %s", path)
    return obj


# ─────────────────────────────────────────────────────────────
# MODÈLE COMPORTEMENTAL
# ─────────────────────────────────────────────────────────────

def save_comportemental(model, scaler, encoder, feature_names: list) -> None:
    """Sauvegarde tous les artefacts du pipeline comportemental."""
    save_artifact(model,        MODEL_COMP_PATH)
    save_artifact(scaler,       SCALER_COMP_PATH)
    save_artifact(encoder,      ENCODER_COMP_PATH)
    save_artifact(feature_names, FEATURES_COMP_PATH)
    logger.info("Pipeline comportemental sauvegardé.")


def load_comportemental() -> dict:
    """
    Charge le pipeline comportemental complet.

    Returns:
        dict avec clés : model, scaler, encoder, feature_names
    """
    return {
        "model":         load_artifact(MODEL_COMP_PATH),
        "scaler":        load_artifact(SCALER_COMP_PATH),
        "encoder":       load_artifact(ENCODER_COMP_PATH),
        "feature_names": load_artifact(FEATURES_COMP_PATH),
    }


# ─────────────────────────────────────────────────────────────
# MODÈLE NLP
# ─────────────────────────────────────────────────────────────

def save_nlp(model, vectorizer, label_encoder) -> None:
    """Sauvegarde tous les artefacts du pipeline NLP."""
    save_artifact(model,         MODEL_NLP_PATH)
    save_artifact(vectorizer,    VECTORIZER_NLP_PATH)
    save_artifact(label_encoder, LABEL_ENCODER_NLP)
    logger.info("Pipeline NLP sauvegardé.")


def load_nlp() -> dict:
    """
    Charge le pipeline NLP complet.

    Returns:
        dict avec clés : model, vectorizer, label_encoder
    """
    return {
        "model":         load_artifact(MODEL_NLP_PATH),
        "vectorizer":    load_artifact(VECTORIZER_NLP_PATH),
        "label_encoder": load_artifact(LABEL_ENCODER_NLP),
    }


# ─────────────────────────────────────────────────────────────
# PARAMÈTRES DE FUSION
# ─────────────────────────────────────────────────────────────

def save_fusion_params(params: dict) -> None:
    """
    Sauvegarde les paramètres de fusion (alpha, métriques…).

    Args:
        params: Dictionnaire contenant au minimum {"alpha": float}.
    """
    save_artifact(params, FUSION_PARAMS_PATH)
    logger.info("Paramètres de fusion sauvegardés : alpha=%.4f", params.get("alpha"))


def load_fusion_params() -> dict:
    """
    Charge les paramètres de fusion.

    Returns:
        Dictionnaire des paramètres (alpha, auc_comp, f1_nlp…).
    """
    return load_artifact(FUSION_PARAMS_PATH)


# ─────────────────────────────────────────────────────────────
# CHARGEMENT GROUPÉ (utilisé au démarrage FastAPI)
# ─────────────────────────────────────────────────────────────

def load_all_models() -> dict:
    """
    Charge tous les modèles en une seule opération.
    Appelé dans le lifespan de l'application FastAPI pour pré-charger
    les artefacts en mémoire et éviter la latence à la première requête.

    Returns:
        dict avec clés : comportemental, nlp, fusion_params

    Raises:
        FileNotFoundError: Si un artefact requis est absent.
    """
    logger.info("Chargement de tous les modèles…")
    all_models = {
        "comportemental": load_comportemental(),
        "nlp":            load_nlp(),
        "fusion_params":  load_fusion_params(),
    }
    logger.info("Tous les modèles chargés avec succès.")
    return all_models


def check_models_exist() -> dict:
    """
    Vérifie l'existence des artefacts sans les charger.
    Utile pour un endpoint de health-check FastAPI.

    Returns:
        dict {nom_artefact: bool (existe ou non)}
    """
    paths = {
        "xgboost_model":      MODEL_COMP_PATH,
        "scaler":             SCALER_COMP_PATH,
        "encoder_comp":       ENCODER_COMP_PATH,
        "feature_names":      FEATURES_COMP_PATH,
        "logistic_nlp":       MODEL_NLP_PATH,
        "tfidf_vectorizer":   VECTORIZER_NLP_PATH,
        "label_encoder_nlp":  LABEL_ENCODER_NLP,
        "fusion_params":      FUSION_PARAMS_PATH,
    }
    return {name: Path(p).exists() for name, p in paths.items()}
