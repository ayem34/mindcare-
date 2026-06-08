"""
features.py — Ingénierie des features comportementales.
Fusionne Teen_Mental_Health.csv et Mental_Health_Dataset.csv,
normalise les colonnes, gère les valeurs manquantes et construit
le vecteur de features final avant entraînement ou inférence.
"""

import logging
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler

from utils.config import (
    CSV_ADULTS,
    CSV_TEEN,
    ADULT_FEATURES,
    TEEN_FEATURES,
    TARGET_TEEN,
    TARGET_ADULTS,
    RANDOM_STATE,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# COLONNES UNIFIÉES APRÈS FUSION DES DEUX DATASETS
# ─────────────────────────────────────────────
UNIFIED_FEATURES = [
    "heures_sommeil",           # Teen : heures_sommeil     / Adults : mappé depuis Days_Indoors (proxy)
    "stress_level",             # Teen : stress_level       / Adults : Growing_Stress encodé
    "anxiety_level",            # Teen : anxiety_level      / Adults : Mood_Swings encodé
    "social_media_hours",       # Teen : daily_social_media_hours / Adults : 0.0 (absent)
    "physical_activity",        # Teen : physical_activity  / Adults : Coping_Struggles inversé
    "family_history",           # Teen : absent (0.0)       / Adults : family_history encodé
    "coping_struggles",         # Teen : absent (0.0)       / Adults : Coping_Struggles
    "mood_swings",              # Teen : absent (0.0)       / Adults : Mood_Swings
    "days_indoors",             # Teen : absent (0.0)       / Adults : Days_Indoors
]


# ─────────────────────────────────────────────
# CHARGEMENT ET NETTOYAGE DES DATASETS SOURCES
# ─────────────────────────────────────────────

def _load_teen(path=CSV_TEEN) -> pd.DataFrame:
    """
    Charge et normalise Teen_Mental_Health.csv.
    Variable cible : depression_label (0 = sain, 1 = dépressif).
    """
    df = pd.read_csv(path)
    logger.info("Teen dataset chargé : %d lignes", len(df))

    # Sélection et renommage
    df = df.rename(columns={
        "daily_social_media_hours": "social_media_hours",
        "sleep_hours": "heures_sommeil",
    })

    # Colonne cible : s'assurer qu'elle est numérique
    if df[TARGET_TEEN].dtype == object:
        df[TARGET_TEEN] = df[TARGET_TEEN].map({"sain": 0, "dépressif": 1,
                                                "healthy": 0, "depressed": 1})

    # Ajout des colonnes absentes (remplies à 0)
    for col in ["family_history", "coping_struggles", "mood_swings", "days_indoors"]:
        if col not in df.columns:
            df[col] = 0.0

    df["label"] = df[TARGET_TEEN].astype(int)
    df["source"] = "teen"
    return df

def _load_adults(path=CSV_ADULTS) -> pd.DataFrame:
    df = pd.read_csv(path)
    logger.info("Adults dataset chargé : %d lignes", len(df))

    # Cible
    df["label"] = (df[TARGET_ADULTS].str.lower() == "yes").astype(int)

    # Colonnes binaires Yes/No
    binary_cols = ["Growing_Stress", "Mood_Swings", "Coping_Struggles", "family_history"]
    for col in binary_cols:
        if col in df.columns:
            df[col] = (df[col].astype(str).str.lower() == "yes").astype(float)

    # Colonne ordinale Days_Indoors
    if "Days_Indoors" in df.columns:
        mapping = {
            "1-14 days": 1,
            "15-30 days": 2,
            "31-60 days": 3,
            "More than 2 months": 4,
            "Go out Every day": 5,
        }
        df["Days_Indoors"] = df["Days_Indoors"].map(mapping).fillna(0).astype(float)

    # Renommage
    df = df.rename(columns={
        "Growing_Stress":    "stress_level",
        "Mood_Swings":       "anxiety_level",
        "Coping_Struggles":  "coping_struggles",
        "Days_Indoors":      "days_indoors",
        "family_history":    "family_history",
    })

    # Colonnes supplémentaires
    df["mood_swings"]        = df["anxiety_level"]
    df["heures_sommeil"]     = 7.0
    df["social_media_hours"] = 0.0
    df["physical_activity"]  = 1.0 - df.get("coping_struggles", pd.Series(0.0, index=df.index))
    df["source"]             = "adults"

    # 🔁 Conversion sécurisée de toutes les colonnes numériques (sauf source, label)
    for col in df.columns:
        if col not in ["source", "label"]:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    return df

# ─────────────────────────────────────────────
# FUSION DES DEUX DATASETS
# ─────────────────────────────────────────────

def build_combined_dataset() -> pd.DataFrame:
    """
    Fusionne les deux datasets comportementaux dans un DataFrame unique
    avec le schéma UNIFIED_FEATURES + 'label'.

    Returns:
        pd.DataFrame prêt pour l'entraînement.
    """
    teen   = _load_teen()
    adults = _load_adults()

    # Colonnes communes à conserver
    cols = UNIFIED_FEATURES + ["label", "source"]
    teen_df   = teen[cols].copy()
    adults_df = adults[cols].copy()

    combined = pd.concat([teen_df, adults_df], ignore_index=True)

    # Imputation des valeurs manquantes par la médiane
    for col in UNIFIED_FEATURES:
        median = combined[col].median()
        combined[col] = combined[col].fillna(median)

    # Clipping pour éviter les outliers extrêmes
    combined["heures_sommeil"]     = combined["heures_sommeil"].clip(0, 24)
    combined["social_media_hours"] = combined["social_media_hours"].clip(0, 24)
    combined["stress_level"]       = combined["stress_level"].clip(0, 10)
    combined["anxiety_level"]      = combined["anxiety_level"].clip(0, 10)

    logger.info(
        "Dataset combiné : %d lignes | Positifs : %d (%.1f%%)",
        len(combined),
        combined["label"].sum(),
        combined["label"].mean() * 100,
    )
    return combined


# ─────────────────────────────────────────────
# PRÉPARATION DES FEATURES POUR L'INFÉRENCE
# ─────────────────────────────────────────────

def build_inference_features(
    entry: dict,
    scaler: Optional[StandardScaler] = None,
    feature_names: Optional[list] = None,
) -> np.ndarray:
    """
    Convertit une entrée utilisateur (dict) en vecteur de features normalisé,
    prêt à être passé au modèle XGBoost lors de l'inférence FastAPI.

    Args:
        entry:         Dictionnaire contenant les valeurs comportementales
                       du formulaire journalier (voir UNIFIED_FEATURES).
        scaler:        StandardScaler ajusté lors de l'entraînement.
        feature_names: Liste ordonnée des features (dans l'ordre d'entraînement).

    Returns:
        np.ndarray de shape (1, n_features).

    Example entry (7 jours agrégés en moyenne) :
        {
            "heures_sommeil": 6.5,
            "stress_level": 7.0,
            "anxiety_level": 6.0,
            "social_media_hours": 4.5,
            "physical_activity": 2.0,
            "family_history": 0.0,
            "coping_struggles": 1.0,
            "mood_swings": 5.0,
            "days_indoors": 4.0,
        }
    """
    if feature_names is None:
        feature_names = UNIFIED_FEATURES

    # Construction du vecteur dans le bon ordre
    values = [float(entry.get(feat, 0.0)) for feat in feature_names]
    X = np.array(values, dtype=np.float32).reshape(1, -1)

    if scaler is not None:
        X = scaler.transform(X)

    return X


def aggregate_weekly_entries(daily_entries: list[dict]) -> dict:
    """
    Agrège 7 entrées journalières en une seule entrée moyenne.
    Utilisé pour transformer la collecte longitudinale en vecteur unique.

    Args:
        daily_entries: Liste de 7 dicts (un par jour), chacun avec
                       les clés de UNIFIED_FEATURES.

    Returns:
        Un dict avec la moyenne de chaque feature sur les 7 jours.
    """
    if not daily_entries:
        raise ValueError("La liste daily_entries est vide.")

    df = pd.DataFrame(daily_entries)
    aggregated = {}
    for feat in UNIFIED_FEATURES:
        if feat in df.columns:
            aggregated[feat] = float(df[feat].mean())
        else:
            aggregated[feat] = 0.0

    # Features dérivées (tendances sur 7 jours)
    if "stress_level" in df.columns and len(df) >= 2:
        aggregated["stress_trend"] = float(df["stress_level"].iloc[-1] - df["stress_level"].iloc[0])
    else:
        aggregated["stress_trend"] = 0.0

    if "heures_sommeil" in df.columns and len(df) >= 2:
        aggregated["sleep_trend"] = float(df["heures_sommeil"].iloc[-1] - df["heures_sommeil"].iloc[0])
    else:
        aggregated["sleep_trend"] = 0.0

    return aggregated
