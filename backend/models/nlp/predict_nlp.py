"""
predict_nlp.py — Inférence du modèle NLP (TF-IDF + Logistic Regression / XLM-RoBERTa).
Expose predict_nlp() appelable depuis FastAPI.
Entrée : texte brut (str) ou liste de textes journaliers (list[str]).
Sortie : classe prédite + probabilités sur les 7 troubles.
Compatible avec les deux phases (TF-IDF et XLM-RoBERTa) sans refonte.
"""

import logging
import sys
from pathlib import Path
from typing import Union

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from models.nlp.preprocessing_text import (
    clean_text,
    clean_text_for_bert,
    concatenate_weekly_texts,
)
from utils.config import NLP_CLASSES, SUICIDAL_CLASSES, USE_XLM_ROBERTA
from utils.model_loader import load_nlp

logger = logging.getLogger(__name__)

# Cache module-level (lazy loading)
_PIPELINE: dict = {}


def _get_pipeline() -> dict:
    """Retourne le pipeline NLP chargé (lazy loading + cache)."""
    global _PIPELINE
    if not _PIPELINE:
        logger.info("Chargement du pipeline NLP depuis le disque…")
        _PIPELINE = load_nlp()
    return _PIPELINE


# ─────────────────────────────────────────────
# INFÉRENCE TF-IDF (Phase 1)
# ─────────────────────────────────────────────

def _predict_tfidf(text_clean: str, pipeline: dict) -> np.ndarray:
    """
    Prédit les probabilités avec TF-IDF + Logistic Regression.

    Returns:
        np.ndarray de shape (n_classes,)
    """
    vectorizer = pipeline["vectorizer"]
    model      = pipeline["model"]

    X = vectorizer.transform([text_clean])
    proba = model.predict_proba(X)[0]  # shape (n_classes,)
    return proba


# ─────────────────────────────────────────────
# INFÉRENCE XLM-ROBERTA (Phase 2 — migration future)
# ─────────────────────────────────────────────

def _predict_xlm_roberta(text: str) -> np.ndarray:
    """
    Prédit les probabilités avec XLM-RoBERTa fine-tuné.
    Appelé automatiquement si USE_XLM_ROBERTA=True.

    Returns:
        np.ndarray de shape (n_classes,)
    """
    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
    except ImportError as e:
        raise ImportError(
            "PyTorch et transformers requis pour XLM-RoBERTa. "
            "Activez USE_XLM_ROBERTA=False pour utiliser TF-IDF."
        ) from e

    from utils.config import XLM_MAX_LENGTH, XLM_MODEL_DIR

    if not hasattr(_predict_xlm_roberta, "_tokenizer"):
        logger.info("Chargement du tokenizer XLM-RoBERTa depuis %s…", XLM_MODEL_DIR)
        _predict_xlm_roberta._tokenizer = AutoTokenizer.from_pretrained(str(XLM_MODEL_DIR))
        _predict_xlm_roberta._model = AutoModelForSequenceClassification.from_pretrained(
            str(XLM_MODEL_DIR)
        )
        _predict_xlm_roberta._model.eval()

    tokenizer = _predict_xlm_roberta._tokenizer
    model     = _predict_xlm_roberta._model

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=XLM_MAX_LENGTH,
        padding=True,
    )

    with torch.no_grad():
        logits = model(**inputs).logits
        proba  = torch.softmax(logits, dim=-1).squeeze().numpy()

    return proba


# ─────────────────────────────────────────────
# POINT D'ENTRÉE PRINCIPAL
# ─────────────────────────────────────────────

def predict_nlp(
    input_data: Union[str, list[str]],
) -> dict:
    """
    Prédit le trouble mental le plus probable à partir d'un ou plusieurs textes.

    Args:
        input_data: Soit :
            - str : texte unique (déjà concaténé ou journal d'un seul jour)
            - list[str] : 7 journaux quotidiens (concaténation automatique)

    Returns:
        dict avec :
            - score_nlp (float ∈ [0, 1]) : score du trouble le plus à risque
              (1 − P(Normal) : plus le score est élevé, plus le risque est fort)
            - classe_predite (str) : nom du trouble prédit
            - probabilites (dict) : {classe: probabilité} pour les 7 classes
            - signal_suicidaire (bool) : True si classe = "Suicidal"
            - texte_nettoye (str) : texte après preprocessing

    Raises:
        FileNotFoundError: Si les artefacts n'ont pas encore été entraînés.
        ValueError: Si l'entrée est vide ou invalide.
    """
    # ── Prétraitement de l'entrée ───────────────────────────────
    if isinstance(input_data, list):
        if not input_data:
            raise ValueError("La liste de textes est vide.")
        # Concaténation des 7 journaux en un seul texte
        text_raw = " ".join([t for t in input_data if t and t.strip()])
    elif isinstance(input_data, str):
        text_raw = input_data
    else:
        raise ValueError(f"Type d'entrée invalide : {type(input_data)}")

    if not text_raw.strip():
        raise ValueError("Le texte fourni est vide après nettoyage.")

    # ── Inférence selon la phase active ─────────────────────────
    if USE_XLM_ROBERTA:
        # Phase 2 : XLM-RoBERTa (nettoyage minimal, texte brut en français)
        text_processed = clean_text_for_bert(text_raw)
        proba = _predict_xlm_roberta(text_processed)
    else:
        # Phase 1 : TF-IDF + Logistic Regression
        text_processed = clean_text(text_raw, remove_stops=True)
        if not text_processed.strip():
            logger.warning("Texte vide après nettoyage TF-IDF. Utilisation du texte brut.")
            text_processed = text_raw[:200]

        pipeline = _get_pipeline()
        proba    = _predict_tfidf(text_processed, pipeline)

    # ── Décodage ─────────────────────────────────────────────────
    # Alignement : les probabilités suivent l'ordre de NLP_CLASSES
    label_idx     = int(np.argmax(proba))
    classe_predite = NLP_CLASSES[label_idx]

    # score_nlp = 1 − P(Normal) : mesure de détresse globale
    idx_normal = NLP_CLASSES.index("Normal")
    score_nlp  = float(1.0 - proba[idx_normal])

    # Probabilités formatées
    probabilites = {
        cls: round(float(p), 4)
        for cls, p in zip(NLP_CLASSES, proba)
    }

    # Signal suicidaire (surveillance renforcée)
    signal_suicidaire = classe_predite in SUICIDAL_CLASSES

    result = {
        "score_nlp":          round(score_nlp, 4),
        "classe_predite":     classe_predite,
        "probabilites":       probabilites,
        "signal_suicidaire":  signal_suicidaire,
        "texte_nettoye":      text_processed[:200],  # tronqué pour la réponse API
    }

    logger.info(
        "Prédiction NLP → score=%.4f, classe=%s, suicidaire=%s",
        score_nlp,
        classe_predite,
        signal_suicidaire,
    )
    return result


def predict_nlp_batch(texts: list[str]) -> list[dict]:
    """
    Inférence NLP sur un lot de textes (un par jour, sans concaténation).
    Utile pour analyser l'évolution du discours sur 7 jours.

    Args:
        texts: Liste de textes (un par jour).

    Returns:
        Liste de dicts predict_nlp (un résultat par texte).
    """
    return [predict_nlp(text) for text in texts if text and text.strip()]


def reload_pipeline() -> None:
    """Force le rechargement des artefacts (après ré-entraînement)."""
    global _PIPELINE
    _PIPELINE = {}
    logger.info("Cache du pipeline NLP vidé.")
