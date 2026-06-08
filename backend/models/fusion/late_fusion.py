"""
late_fusion.py — Implémentation de la Late Fusion pondérée.
Formule : score_final = alpha × score_comp + (1 − alpha) × score_nlp
alpha est calculé automatiquement à partir des performances de validation :
    alpha = AUC_comp / (AUC_comp + F1_NLP)
Ce module gère aussi le calcul du niveau de risque et la sauvegarde des paramètres.
"""

import logging
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from utils.config import (
    DEFAULT_ALPHA,
    NLP_CLASSES,
    RISK_THRESHOLDS,
    SUICIDAL_CLASSES,
)
from utils.model_loader import load_fusion_params, save_fusion_params

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# CALCUL D'ALPHA (pondération dynamique)
# ─────────────────────────────────────────────

def compute_alpha(auc_comp: float, f1_nlp: float) -> float:
    """
    Calcule le coefficient de pondération alpha à partir des métriques de validation.

        alpha = AUC_comp / (AUC_comp + F1_NLP)

    Interprétation :
        - alpha proche de 1.0 → le modèle comportemental est plus fiable
        - alpha proche de 0.0 → le modèle NLP est plus fiable
        - alpha = 0.5          → contribution égale (valeur par défaut)

    Args:
        auc_comp: AUC-ROC du modèle comportemental sur le jeu de validation.
        f1_nlp:   F1-Score macro du modèle NLP sur le jeu de validation.

    Returns:
        alpha (float ∈ [0, 1])

    Raises:
        ValueError: Si les métriques sont invalides (hors [0, 1]).
    """
    if not (0.0 <= auc_comp <= 1.0):
        raise ValueError(f"auc_comp invalide : {auc_comp}. Attendu : [0, 1].")
    if not (0.0 <= f1_nlp <= 1.0):
        raise ValueError(f"f1_nlp invalide : {f1_nlp}. Attendu : [0, 1].")

    denom = auc_comp + f1_nlp
    if denom == 0.0:
        logger.warning("auc_comp + f1_nlp = 0. Retour à alpha par défaut : %.2f", DEFAULT_ALPHA)
        return DEFAULT_ALPHA

    alpha = auc_comp / denom
    logger.info(
        "Alpha calculé : %.4f (AUC_comp=%.4f, F1_NLP=%.4f)",
        alpha, auc_comp, f1_nlp,
    )
    return float(alpha)


# ─────────────────────────────────────────────
# FUSION DES SCORES
# ─────────────────────────────────────────────

def compute_fusion_score(
    score_comp: float,
    score_nlp: float,
    alpha: Optional[float] = None,
) -> float:
    """
    Applique la formule de late fusion pondérée.

        score_final = alpha × score_comp + (1 − alpha) × score_nlp

    Args:
        score_comp: Score comportemental ∈ [0, 1] (sortie XGBoost).
        score_nlp:  Score NLP ∈ [0, 1] (1 − P(Normal), sortie Logistic Regression).
        alpha:      Coefficient de pondération. Si None, charge depuis le disque
                    ou utilise DEFAULT_ALPHA.

    Returns:
        score_final (float ∈ [0, 1])
    """
    if alpha is None:
        try:
            params = load_fusion_params()
            alpha  = params.get("alpha", DEFAULT_ALPHA)
        except FileNotFoundError:
            logger.warning(
                "Paramètres de fusion non trouvés. Utilisation de alpha=%.2f",
                DEFAULT_ALPHA,
            )
            alpha = DEFAULT_ALPHA

    # Clipping de sécurité
    score_comp = max(0.0, min(1.0, float(score_comp)))
    score_nlp  = max(0.0, min(1.0, float(score_nlp)))
    alpha      = max(0.0, min(1.0, float(alpha)))

    score_final = alpha * score_comp + (1.0 - alpha) * score_nlp

    logger.debug(
        "Fusion : alpha=%.4f | score_comp=%.4f | score_nlp=%.4f → score_final=%.4f",
        alpha, score_comp, score_nlp, score_final,
    )
    return round(float(score_final), 4)


# ─────────────────────────────────────────────
# NIVEAU DE RISQUE
# ─────────────────────────────────────────────

def get_risk_level(score_final: float) -> str:
    """
    Convertit le score final en niveau de risque clinique.

        score < 0.35  → "faible"
        0.35 ≤ score < 0.65 → "modere"
        score ≥ 0.65  → "eleve"

    Args:
        score_final: Score de fusion ∈ [0, 1].

    Returns:
        "faible" | "modere" | "eleve"
    """
    if score_final < RISK_THRESHOLDS["faible"]:
        return "faible"
    elif score_final < RISK_THRESHOLDS["modere"]:
        return "modere"
    else:
        return "eleve"


RISK_MESSAGES_FR = {
    "faible": (
        "Votre bilan de la semaine ne montre pas de signes préoccupants. "
        "Continuez à prendre soin de vous et à maintenir vos routines bien-être."
    ),
    "modere": (
        "Votre bilan révèle quelques signaux qui méritent attention. "
        "Il pourrait être bénéfique d'en parler à un proche ou à un professionnel de santé."
    ),
    "eleve": (
        "Votre bilan indique des signaux importants. "
        "Nous vous recommandons fortement de consulter un professionnel de santé mentale."
    ),
}


def get_risk_message(niveau_risque: str) -> str:
    """Retourne le message explicatif en français pour le niveau de risque."""
    return RISK_MESSAGES_FR.get(niveau_risque, "")


# ─────────────────────────────────────────────
# SAUVEGARDE ET MISE À JOUR D'ALPHA
# ─────────────────────────────────────────────

def calibrate_and_save(auc_comp: float, f1_nlp: float) -> float:
    """
    Calcule alpha à partir des métriques, sauvegarde les paramètres de fusion
    et retourne alpha.

    Args:
        auc_comp: AUC-ROC du modèle comportemental (évaluation sur test set).
        f1_nlp:   F1-Score macro du modèle NLP (évaluation sur test set).

    Returns:
        alpha calculé.
    """
    alpha = compute_alpha(auc_comp, f1_nlp)

    params = {
        "alpha":    alpha,
        "auc_comp": auc_comp,
        "f1_nlp":   f1_nlp,
    }
    save_fusion_params(params)
    return alpha


# ─────────────────────────────────────────────
# RÉSULTAT COMPLET (utilisé par predict_global)
# ─────────────────────────────────────────────

def build_fusion_result(
    score_comp: float,
    score_nlp: float,
    classe_nlp: str,
    signal_suicidaire: bool,
    probabilites_nlp: dict,
    alpha: Optional[float] = None,
) -> dict:
    """
    Construit le dictionnaire de résultat complet de la fusion multimodale.

    Args:
        score_comp:         Score comportemental ∈ [0, 1].
        score_nlp:          Score NLP ∈ [0, 1].
        classe_nlp:         Classe NLP prédite (str, ex: "Depression").
        signal_suicidaire:  True si le modèle NLP a prédit "Suicidal".
        probabilites_nlp:   Dict {classe: probabilité} pour les 7 classes.
        alpha:              Coefficient de pondération (chargé si None).

    Returns:
        dict complet prêt à être retourné par FastAPI.
    """
    score_final   = compute_fusion_score(score_comp, score_nlp, alpha=alpha)
    niveau_risque = get_risk_level(score_final)
    message       = get_risk_message(niveau_risque)

    return {
        "score_final":        score_final,
        "niveau_risque":      niveau_risque,
        "message_fr":         message,
        "signal_suicidaire":  signal_suicidaire,
        "details": {
            "score_comportemental": round(score_comp, 4),
            "score_nlp":            round(score_nlp, 4),
            "alpha_utilise":        round(float(alpha) if alpha is not None else DEFAULT_ALPHA, 4),
            "classe_nlp":           classe_nlp,
            "probabilites_nlp":     probabilites_nlp,
        },
    }
