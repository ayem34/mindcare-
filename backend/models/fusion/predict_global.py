"""
predict_global.py — Prédiction globale multimodale (point d'entrée FastAPI).
Orchestre les deux modèles (comportemental + NLP) et la fusion.
Expose predict_global() et predict_global_from_raw() pour FastAPI.
"""

import logging
import sys
from pathlib import Path
from typing import Optional, Union

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from models.comportemental.predict_comportemental import (
    predict_comportemental,
    reload_pipeline as reload_comp,
)
from models.nlp.predict_nlp import (
    predict_nlp,
    reload_pipeline as reload_nlp,
)
from models.fusion.late_fusion import (
    build_fusion_result,
    load_fusion_params,
)
from utils.config import DEFAULT_ALPHA, JOURS_EVALUATION, SUICIDAL_CLASSES

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# POINT D'ENTRÉE PRINCIPAL — SCORES PRÉ-CALCULÉS
# ─────────────────────────────────────────────

def predict_global(
    score_comp: float,
    score_nlp: float,
    classe_nlp: str,
    signal_suicidaire: bool,
    probabilites_nlp: dict,
    alpha: Optional[float] = None,
) -> dict:
    """
    Calcule le score final par late fusion à partir de scores déjà calculés.
    Utilisé quand les deux prédictions partielles ont déjà été obtenues.

    Args:
        score_comp:        Score comportemental ∈ [0, 1].
        score_nlp:         Score NLP ∈ [0, 1].
        classe_nlp:        Classe NLP prédite (str).
        signal_suicidaire: True si le modèle NLP a détecté "Suicidal".
        probabilites_nlp:  Dict {classe: probabilité}.
        alpha:             Coefficient de fusion (chargé depuis le disque si None).

    Returns:
        dict complet (voir build_fusion_result).
    """
    # Chargement d'alpha si non fourni
    if alpha is None:
        try:
            params = load_fusion_params()
            alpha  = params.get("alpha", DEFAULT_ALPHA)
        except FileNotFoundError:
            logger.warning("Paramètres de fusion absents. alpha=%.2f utilisé.", DEFAULT_ALPHA)
            alpha = DEFAULT_ALPHA

    result = build_fusion_result(
        score_comp=score_comp,
        score_nlp=score_nlp,
        classe_nlp=classe_nlp,
        signal_suicidaire=signal_suicidaire,
        probabilites_nlp=probabilites_nlp,
        alpha=alpha,
    )
    logger.info(
        "Prédiction globale → score_final=%.4f | niveau=%s | suicidaire=%s",
        result["score_final"],
        result["niveau_risque"],
        result["signal_suicidaire"],
    )
    return result


# ─────────────────────────────────────────────
# POINT D'ENTRÉE COMPLET — DONNÉES BRUTES
# ─────────────────────────────────────────────

def predict_global_from_raw(
    daily_entries: list[dict],
    daily_texts: list[str],
    alpha: Optional[float] = None,
) -> dict:
    """
    Pipeline complet de prédiction multimodale à partir des données brutes
    de l'utilisateur (7 jours de collecte).

    C'est la fonction principale appelée par FastAPI après validation des données.

    Args:
        daily_entries: Liste de 7 dicts comportementaux (un par jour).
                       Chaque dict contient les clés de UNIFIED_FEATURES.
                       Exemple :
                       [
                           {
                               "heures_sommeil": 6.0,
                               "stress_level": 7.0,
                               "anxiety_level": 5.0,
                               "social_media_hours": 3.0,
                               "physical_activity": 1.0,
                               "family_history": 0.0,
                               "coping_struggles": 1.0,
                               "mood_swings": 4.0,
                               "days_indoors": 3.0,
                           },
                           ... (× 7)
                       ]

        daily_texts:   Liste de 7 textes (journaux quotidiens en français).
                       Exemple :
                       [
                           "Aujourd'hui j'ai eu du mal à me lever...",
                           "Je me sens épuisé sans raison apparente...",
                           ... (× 7)
                       ]

        alpha:         Coefficient de fusion optionnel. Si None, valeur
                       sauvegardée sur disque ou DEFAULT_ALPHA.

    Returns:
        dict avec :
            - score_final (float ∈ [0, 1])
            - niveau_risque ("faible" | "modere" | "eleve")
            - message_fr (str) : message adapté en français
            - signal_suicidaire (bool) : alerte urgente si True
            - details (dict) :
                - score_comportemental, score_nlp, alpha_utilise
                - classe_nlp, probabilites_nlp
                - label_comportemental

    Raises:
        ValueError: Si les listes d'entrée sont vides ou de mauvaise taille.
        FileNotFoundError: Si les modèles n'ont pas été entraînés.
    """
    # ── Validation des entrées ─────────────────────────────────
    if not daily_entries:
        raise ValueError("daily_entries est vide. Fournissez au moins une entrée.")
    if not daily_texts:
        raise ValueError("daily_texts est vide. Fournissez au moins un texte.")

    if len(daily_entries) != JOURS_EVALUATION:
        logger.warning(
            "Nombre d'entrées comportementales : %d (attendu : %d). "
            "L'agrégation sera effectuée sur les données disponibles.",
            len(daily_entries), JOURS_EVALUATION,
        )
    if len(daily_texts) != JOURS_EVALUATION:
        logger.warning(
            "Nombre de journaux textuels : %d (attendu : %d).",
            len(daily_texts), JOURS_EVALUATION,
        )

    # ── Prédiction comportementale ─────────────────────────────
    logger.info("=== PRÉDICTION COMPORTEMENTALE ===")
    try:
        comp_result = predict_comportemental(daily_entries)
    except Exception as e:
        logger.error("Erreur dans le modèle comportemental : %s", e)
        raise

    score_comp       = comp_result["score_comportemental"]
    label_comp       = comp_result["label_predit"]

    # ── Prédiction NLP ─────────────────────────────────────────
    logger.info("=== PRÉDICTION NLP ===")
    try:
        nlp_result = predict_nlp(daily_texts)
    except Exception as e:
        logger.error("Erreur dans le modèle NLP : %s", e)
        raise

    score_nlp         = nlp_result["score_nlp"]
    classe_nlp        = nlp_result["classe_predite"]
    signal_suicidaire = nlp_result["signal_suicidaire"]
    probabilites_nlp  = nlp_result["probabilites"]

    # ── Fusion ─────────────────────────────────────────────────
    logger.info("=== LATE FUSION ===")
    result = predict_global(
        score_comp=score_comp,
        score_nlp=score_nlp,
        classe_nlp=classe_nlp,
        signal_suicidaire=signal_suicidaire,
        probabilites_nlp=probabilites_nlp,
        alpha=alpha,
    )

    # Enrichissement du résultat avec le label comportemental
    result["details"]["label_comportemental"] = label_comp

    # ── Alerte suicidaire (log prioritaire) ─────────────────────
    if signal_suicidaire:
        logger.warning(
            "🚨 SIGNAL SUICIDAIRE DÉTECTÉ — score_final=%.4f",
            result["score_final"],
        )

    return result


# ─────────────────────────────────────────────
# RECHARGEMENT DES PIPELINES (hot reload)
# ─────────────────────────────────────────────

def reload_all_pipelines() -> None:
    """
    Vide les caches de tous les pipelines.
    À appeler via un endpoint FastAPI /admin/reload après un ré-entraînement
    sans redémarrer le serveur.
    """
    reload_comp()
    reload_nlp()
    logger.info("Tous les pipelines rechargés.")
