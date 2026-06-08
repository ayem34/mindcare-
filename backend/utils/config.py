"""
config.py — Configuration centralisée du pipeline IA Santé Mentale
Toutes les constantes, chemins et hyperparamètres sont définis ici.
"""

import os
from pathlib import Path

# ─────────────────────────────────────────────
# CHEMINS RACINES
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/

DATA_DIR       = BASE_DIR.parent / "data"
MODELS_DIR     = BASE_DIR / "models"
SAVED_MODELS   = BASE_DIR / "saved_models"          # artefacts joblib

# Sous-dossiers de sauvegarde
SAVED_COMPORTEMENTAL = SAVED_MODELS / "comportemental"
SAVED_NLP            = SAVED_MODELS / "nlp"
SAVED_FUSION         = SAVED_MODELS / "fusion"

# Création automatique des dossiers si absents
for _dir in [SAVED_COMPORTEMENTAL, SAVED_NLP, SAVED_FUSION]:
    _dir.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────
# FICHIERS CSV (datasets Kaggle)
# ─────────────────────────────────────────────
CSV_TEEN         = DATA_DIR / "Teen_Mental_Health.csv"
CSV_ADULTS       = DATA_DIR / "Mental Health Dataset.csv"
CSV_NLP          = DATA_DIR / "Combined Data.csv"

# ─────────────────────────────────────────────
# NOMS DES ARTEFACTS SAUVEGARDÉS (joblib)
# ─────────────────────────────────────────────
MODEL_COMP_PATH      = SAVED_COMPORTEMENTAL / "xgboost_model.joblib"
SCALER_COMP_PATH     = SAVED_COMPORTEMENTAL / "scaler.joblib"
ENCODER_COMP_PATH    = SAVED_COMPORTEMENTAL / "label_encoder.joblib"
FEATURES_COMP_PATH   = SAVED_COMPORTEMENTAL / "feature_names.joblib"

MODEL_NLP_PATH       = SAVED_NLP / "logistic_regression.joblib"
VECTORIZER_NLP_PATH  = SAVED_NLP / "tfidf_vectorizer.joblib"
LABEL_ENCODER_NLP    = SAVED_NLP / "label_encoder_nlp.joblib"

# XLM-RoBERTa (migration future)
XLM_MODEL_DIR        = SAVED_NLP / "xlm_roberta"

FUSION_PARAMS_PATH   = SAVED_FUSION / "fusion_params.joblib"

# ─────────────────────────────────────────────
# VARIABLES CIBLES
# ─────────────────────────────────────────────
TARGET_TEEN    = "depression_label"       # binaire  0 / 1
TARGET_ADULTS  = "treatment"              # binaire  Yes / No
TARGET_NLP     = "status"                 # 7 classes

NLP_CLASSES = [
    "Normal",
    "Depression",
    "Suicidal",
    "Anxiety",
    "Bipolar",
    "Stress",
    "Personality disorder",
]

# ─────────────────────────────────────────────
# FEATURES COMPORTEMENTALES
# ─────────────────────────────────────────────

# Features du dataset Teen_Mental_Health
TEEN_FEATURES = [
    "heures_sommeil",
    "stress_level",
    "anxiety_level",
    "daily_social_media_hours",
    "physical_activity",
]

# Features du dataset Mental_Health_Dataset (adultes)
ADULT_FEATURES = [
    "Days_Indoors",
    "Growing_Stress",
    "Mood_Swings",
    "Coping_Struggles",
    "family_history",
]

# ─────────────────────────────────────────────
# HYPERPARAMÈTRES MODÈLE COMPORTEMENTAL (XGBoost)
# ─────────────────────────────────────────────

XGBOOST_PARAMS = {
    "n_estimators": 500,
    "max_depth": 4,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "eval_metric": "logloss",
    "random_state": 42,
    "n_jobs": -1,
    "scale_pos_weight": 1.5,   # ou dynamique
}
TEST_SIZE      = 0.2
RANDOM_STATE   = 42
SMOTE_STRATEGY = "minority"       # sur-échantillonnage de la classe minoritaire

# ─────────────────────────────────────────────
# HYPERPARAMÈTRES MODÈLE NLP (TF-IDF + Logistic Regression)
# ─────────────────────────────────────────────
TFIDF_PARAMS = {
    "max_features": 10_000,
    "ngram_range":  (1, 2),
    "sublinear_tf": True,          # log-scaling  →  meilleur pour le texte long
    "min_df":       2,
    "max_df":       0.95,
    "analyzer":     "word",
}

LOGISTIC_PARAMS = {
    "C":            1.0,
    "max_iter":     1000,
    "solver":       "lbfgs",
    "random_state": 42,
    "n_jobs":       -1,
    "class_weight": "balanced",
}

# Taille maximale d'un journal quotidien (en tokens après split)
MAX_TEXT_LENGTH = 512

# ─────────────────────────────────────────────
# FUSION — LATE FUSION PONDÉRÉE
# ─────────────────────────────────────────────
# alpha sera calculé dynamiquement à partir des performances de validation :
#   alpha = AUC_comp / (AUC_comp + F1_NLP)
# Valeur par défaut utilisée si les modèles ne sont pas encore évalués.
DEFAULT_ALPHA = 0.5

# Seuils de décision pour le niveau de risque (score_final ∈ [0, 1])
RISK_THRESHOLDS = {
    "faible":  0.35,   # score < 0.35
    "modere":  0.65,   # 0.35 ≤ score < 0.65
    "eleve":   1.01,   # score ≥ 0.65
}

# Classes NLP considérées comme signaux suicidaires (surveillance renforcée)
SUICIDAL_CLASSES = {"Suicidal"}

# ─────────────────────────────────────────────
# COLLECTE LONGITUDINALE
# ─────────────────────────────────────────────
JOURS_EVALUATION = 7    # nombre de jours consécutifs requis

# ─────────────────────────────────────────────
# XLM-RoBERTa — CONFIGURATION MIGRATION FUTURE
# (activé en définissant USE_XLM_ROBERTA=True)
# ─────────────────────────────────────────────
USE_XLM_ROBERTA     = False
XLM_MODEL_NAME      = "cardiffnlp/twitter-xlm-roberta-base"
XLM_MAX_LENGTH      = 128
XLM_BATCH_SIZE      = 16
XLM_LEARNING_RATE   = 2e-5
XLM_EPOCHS          = 3
