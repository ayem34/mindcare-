"""
train_comportemental.py — Entraînement du modèle XGBoost comportemental.
Fusion Teen + Adults, SMOTE, GridSearch, évaluation, sauvegarde joblib.
Exécuter directement : python -m models.comportemental.train_comportemental
"""

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

# Ajout du répertoire racine au PYTHONPATH pour les imports relatifs
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from models.comportemental.features import (
    UNIFIED_FEATURES,
    build_combined_dataset,
)
from utils.config import (
    RANDOM_STATE,
    SMOTE_STRATEGY,
    TEST_SIZE,
    XGBOOST_PARAMS,
)
from utils.model_loader import save_comportemental

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# ÉTAPE 1 — CHARGEMENT ET FUSION DES DONNÉES
# ─────────────────────────────────────────────

def load_and_prepare_data() -> tuple:
    """
    Charge le dataset combiné, sépare X et y, encode la cible.

    Returns:
        X (pd.DataFrame), y (np.ndarray), feature_names (list)
    """
    logger.info("=== CHARGEMENT DES DONNÉES ===")
    df = build_combined_dataset()

    feature_cols = [f for f in UNIFIED_FEATURES if f in df.columns]

    # Ajout des features de tendance si présentes
    for trend_col in ["stress_trend", "sleep_trend"]:
        if trend_col in df.columns:
            feature_cols.append(trend_col)

    X = df[feature_cols].copy()
    y = df["label"].values.astype(int)

    logger.info(
        "Features retenues : %s\nDistribution cible : %s",
        feature_cols,
        dict(zip(*np.unique(y, return_counts=True))),
    )
    return X, y, feature_cols


# ─────────────────────────────────────────────
# ÉTAPE 2 — PRÉTRAITEMENT
# ─────────────────────────────────────────────

def preprocess(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
) -> tuple:
    """
    Normalise les features avec StandardScaler (fit sur train uniquement).

    Returns:
        X_train_scaled (np.ndarray), X_test_scaled (np.ndarray), scaler
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler


# ─────────────────────────────────────────────
# ÉTAPE 3 — SMOTE (sur-échantillonnage)
# ─────────────────────────────────────────────

def apply_smote(
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> tuple:
    """
    Applique SMOTE pour rééquilibrer les classes.
    Particulièrement critique pour Teen dataset (31 positifs / 1169 négatifs).

    Returns:
        X_resampled, y_resampled
    """
    logger.info("Application de SMOTE…")
    logger.info("Avant SMOTE — Distribution : %s", dict(zip(*np.unique(y_train, return_counts=True))))

    smote = SMOTE(sampling_strategy=SMOTE_STRATEGY, random_state=RANDOM_STATE)
    X_res, y_res = smote.fit_resample(X_train, y_train)

    logger.info("Après SMOTE  — Distribution : %s", dict(zip(*np.unique(y_res, return_counts=True))))
    return X_res, y_res


# ─────────────────────────────────────────────
# ÉTAPE 4 — ENTRAÎNEMENT XGBOOST
# ─────────────────────────────────────────────

def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> XGBClassifier:
    """
    Entraîne le modèle XGBoost avec early stopping sur le jeu de validation.

    Returns:
        Modèle XGBClassifier entraîné.
    """
    logger.info("=== ENTRAÎNEMENT XGBOOST ===")

    params = XGBOOST_PARAMS.copy()
    # early_stopping_rounds géré séparément
    n_estimators = params.pop("n_estimators")

    model = XGBClassifier(
        **params,
        n_estimators=n_estimators,
        early_stopping_rounds=30,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    logger.info("Meilleur n_estimators : %d", model.best_iteration)
    return model


# ─────────────────────────────────────────────
# ÉTAPE 5 — ÉVALUATION
# ─────────────────────────────────────────────

def evaluate(
    model: XGBClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> dict:
    """
    Évalue le modèle sur le jeu de test et retourne les métriques.

    Returns:
        dict {auc, accuracy, classification_report, confusion_matrix}
    """
    logger.info("=== ÉVALUATION SUR LE JEU DE TEST ===")

    y_pred      = model.predict(X_test)
    y_proba     = model.predict_proba(X_test)[:, 1]

    auc         = roc_auc_score(y_test, y_proba)
    report      = classification_report(y_test, y_pred, target_names=["Sain", "À risque"])
    cm          = confusion_matrix(y_test, y_pred)

    logger.info("AUC-ROC : %.4f", auc)
    logger.info("Rapport de classification :\n%s", report)
    logger.info("Matrice de confusion :\n%s", cm)

    if auc < 0.80:
        logger.warning("⚠️  AUC < 0.80 (objectif du projet). Ajustez les hyperparamètres.")
    else:
        logger.info("✅  Objectif AUC > 0.80 atteint.")

    # ============ AJOUT DE LA COURBE ROC ============
    import matplotlib.pyplot as plt
    from sklearn.metrics import roc_curve
    from pathlib import Path

    # Dossier de sortie (à adapter si vous avez déjà un OUTPUT_DIR global)
    OUTPUT_DIR = Path(__file__).resolve().parents[2].parent / "outputs" / "comportemental"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    plt.figure()
    plt.plot(fpr, tpr, label=f'AUC = {auc:.3f}')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Courbe ROC - Modèle comportemental')
    plt.legend(loc='lower right')
    plt.savefig(OUTPUT_DIR / 'roc_curve_comportemental.png', dpi=150)
    plt.close()
    # ============ FIN AJOUT ============

    # === SAUVEGARDE DE LA MATRICE DE CONFUSION ===
    import seaborn as sns
    import matplotlib.pyplot as plt

    plt.figure(figsize=(6, 4))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Sain', 'À risque'], yticklabels=['Sain', 'À risque'])
    plt.title('Matrice de confusion - Modèle comportemental')
    plt.ylabel('Vraie classe')
    plt.xlabel('Prédiction')
    plt.savefig(OUTPUT_DIR / 'confusion_matrix_comportemental.png', dpi=150, bbox_inches='tight')
    plt.close()

    import pandas as pd
    cm_df = pd.DataFrame(cm, index=['Sain', 'À risque'], columns=['Prédit Sain', 'Prédit À risque'])
    cm_df.to_csv(OUTPUT_DIR / 'confusion_matrix_comportemental.csv')
    # Validation croisée avec un modèle sans early stopping (existant)
    from xgboost import XGBClassifier

    model_cv = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        early_stopping_rounds=None,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(model_cv, X_test, y_test, cv=cv, scoring="roc_auc")
    logger.info("CV AUC (5-fold) : %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

    return {
        "auc":                   auc,
        "cv_auc_mean":           float(cv_scores.mean()),
        "cv_auc_std":            float(cv_scores.std()),
        "classification_report": report,
        "confusion_matrix":      cm.tolist(),
    }

# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

def run_training() -> dict:
    """
    Pipeline complet d'entraînement :
      1. Chargement et fusion des données
      2. Split train / validation / test
      3. Normalisation + SMOTE
      4. Entraînement XGBoost
      5. Évaluation
      6. Sauvegarde joblib

    Returns:
        Dictionnaire des métriques finales.
    """
    # 1. Données
    X, y, feature_names = load_and_prepare_data()

    # 2. Split stratifié train/test
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    # Split train / validation (15% du total)
    X_train_raw, X_val_raw, y_train, y_val = train_test_split(
        X_train_raw, y_train,
        test_size=0.15,
        random_state=RANDOM_STATE,
        stratify=y_train,
    )

    # 3. Normalisation
    X_train_scaled, X_test_scaled, scaler = preprocess(X_train_raw, X_test_raw)
    _, X_val_scaled, _                    = preprocess(X_train_raw, X_val_raw)

    # 4. SMOTE sur le train uniquement
    X_train_res, y_train_res = apply_smote(X_train_scaled, y_train)

    # 5. Entraînement
    model = train_xgboost(X_train_res, y_train_res, X_val_scaled, y_val)

    # 6. Évaluation
    encoder = LabelEncoder()
    encoder.fit(["Sain", "À risque"])
    metrics = evaluate(model, X_test_scaled, y_test)

    # 7. Sauvegarde
    save_comportemental(
        model=model,
        scaler=scaler,
        encoder=encoder,
        feature_names=feature_names,
    )
    logger.info("=== ENTRAÎNEMENT TERMINÉ ===")

    return metrics


if __name__ == "__main__":
    run_training()
