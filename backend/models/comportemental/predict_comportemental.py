"""
predict_comportemental.py — Inférence du modèle comportemental XGBoost.
Expose predict_comportemental() appelable depuis FastAPI.
Entrée : dict ou liste de dicts (entrées journalières sur 7 jours).
Sortie : score ∈ [0, 1] (probabilité d'être à risque).
"""

import logging
import sys
from pathlib import Path
from typing import Union

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from models.comportemental.features import (
    aggregate_weekly_entries,
    build_inference_features,
)
from utils.model_loader import load_comportemental

logger = logging.getLogger(__name__)

# Cache module-level pour éviter de recharger les artefacts à chaque requête
_PIPELINE: dict = {}


def _get_pipeline() -> dict:
    """
    Retourne le pipeline comportemental chargé (lazy loading + cache).
    Thread-safe grâce à la GIL Python pour les lectures de dict.
    """
    global _PIPELINE
    if not _PIPELINE:
        logger.info("Chargement du pipeline comportemental depuis le disque…")
        _PIPELINE = load_comportemental()
    return _PIPELINE


def predict_comportemental(
    input_data: Union[dict, list[dict]],
) -> dict:
    """
    Prédit le score de risque comportemental pour un utilisateur.

    Args:
        input_data: Soit :
            - Un dict unique (entrée déjà agrégée sur 7 jours)
            - Une liste de 7 dicts (entrées journalières — agrégation automatique)

    Returns:
        dict avec :
            - score_comportemental (float, ∈ [0, 1])
            - label_predit (str : "Sain" | "À risque")
            - probabilites (dict : {"Sain": float, "À risque": float})
            - features_utilisees (list[str])

    Raises:
        ValueError: Si la liste d'entrées est vide ou contient un mauvais format.
        FileNotFoundError: Si les artefacts n'ont pas encore été entraînés.
    """
    pipeline = _get_pipeline()
    model         = pipeline["model"]
    scaler        = pipeline["scaler"]
    encoder       = pipeline["encoder"]
    feature_names = pipeline["feature_names"]

    # Agrégation si 7 entrées journalières sont fournies
    if isinstance(input_data, list):
        if len(input_data) == 0:
            raise ValueError("La liste d'entrées journalières est vide.")
        entry = aggregate_weekly_entries(input_data)
        logger.debug("Entrées journalières agrégées en : %s", entry)
    elif isinstance(input_data, dict):
        entry = input_data
    else:
        raise ValueError(
            f"Type d'entrée invalide : {type(input_data)}. "
            "Attendu : dict ou list[dict]."
        )

    # Vectorisation
    X = build_inference_features(
        entry,
        scaler=scaler,
        feature_names=feature_names,
    )

    # Prédiction
    proba = model.predict_proba(X)[0]       # shape (2,) : [P(Sain), P(À risque)]
    label_idx = int(np.argmax(proba))

    # Décodage du label
    try:
        label_predit = encoder.inverse_transform([label_idx])[0]
    except Exception:
        label_predit = "À risque" if label_idx == 1 else "Sain"

    score_comportemental = float(proba[1])  # probabilité de la classe positive

    result = {
        "score_comportemental": round(score_comportemental, 4),
        "label_predit":         label_predit,
        "probabilites": {
            "Sain":      round(float(proba[0]), 4),
            "À risque":  round(float(proba[1]), 4),
        },
        "features_utilisees": feature_names,
    }

    logger.info(
        "Prédiction comportementale → score=%.4f, label=%s",
        score_comportemental,
        label_predit,
    )
    return result


def reload_pipeline() -> None:
    """
    Force le rechargement des artefacts depuis le disque.
    Utile après un ré-entraînement sans redémarrer le serveur FastAPI.
    """
    global _PIPELINE
    _PIPELINE = {}
    logger.info("Cache du pipeline comportemental vidé.")
