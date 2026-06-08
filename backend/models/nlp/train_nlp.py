"""
train_nlp.py — Entraînement du modèle NLP.
Phase 1 : TF-IDF + Régression Logistique (7 classes).
Architecture conçue pour une migration transparente vers XLM-RoBERTa (Phase 2)
via le flag USE_XLM_ROBERTA dans config.py.
Exécuter : python -m models.nlp.train_nlp
"""

import logging
import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from models.nlp.preprocessing_text import (
    get_train_test_split,
    load_nlp_dataset,
)
from utils.config import (
    LOGISTIC_PARAMS,
    NLP_CLASSES,
    RANDOM_STATE,
    TFIDF_PARAMS,
    USE_XLM_ROBERTA,
)
from utils.model_loader import save_nlp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# PHASE 1 — TF-IDF + RÉGRESSION LOGISTIQUE
# ─────────────────────────────────────────────

def train_tfidf_pipeline(
    X_train,
    y_train,
    X_test,
    y_test,
) -> tuple:
    """
    Entraîne le pipeline TF-IDF → Régression Logistique.
    y_train et y_test sont des entiers (0..6) représentant les classes.
    """
    logger.info("=== PHASE 1 : TF-IDF + RÉGRESSION LOGISTIQUE ===")

    # Vérification optionnelle
    logger.info("Labels uniques dans y_train : %s", np.unique(y_train))

    # ── TF-IDF ─────────────────────────────────
    logger.info("Vectorisation TF-IDF (max_features=%d)…", TFIDF_PARAMS["max_features"])
    vectorizer = TfidfVectorizer(**TFIDF_PARAMS)
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf  = vectorizer.transform(X_test)

    logger.info(
        "Matrice TF-IDF : train=%s | test=%s",
        X_train_tfidf.shape,
        X_test_tfidf.shape,
    )

    # ── Régression Logistique ───────────────────
    logger.info("Entraînement de la Régression Logistique…")
    model = LogisticRegression(**LOGISTIC_PARAMS)
    model.fit(X_train_tfidf, y_train)

    # ── Évaluation ─────────────────────────────
    y_pred = model.predict(X_test_tfidf)
    f1 = f1_score(y_test, y_pred, average="macro")
    report = classification_report(
        y_test, y_pred,
        target_names=NLP_CLASSES,
        zero_division=0,
    )
    cm = confusion_matrix(y_test, y_pred)

    logger.info("F1-Score Macro : %.4f", f1)
    logger.info("Rapport de classification :\n%s", report)

    if f1 < 0.75:
        logger.warning("⚠️  F1 < 0.75 (objectif du projet). Envisagez XLM-RoBERTa.")
    else:
        logger.info("✅  Objectif F1 > 0.75 atteint.")

    # ============ VISUALISATIONS ============
    from pathlib import Path
    import matplotlib.pyplot as plt
    import seaborn as sns
    import pandas as pd

    OUTPUT_DIR = Path(__file__).resolve().parents[2].parent / "outputs" / "nlp"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Matrice de confusion (image + CSV)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=NLP_CLASSES, yticklabels=NLP_CLASSES)
    plt.title('Matrice de confusion - NLP (Logistic Regression)')
    plt.ylabel('Vraie classe')
    plt.xlabel('Prédiction')
    plt.savefig(OUTPUT_DIR / 'confusion_matrix_nlp.png', dpi=150, bbox_inches='tight')
    plt.close()

    cm_df = pd.DataFrame(cm, index=NLP_CLASSES, columns=NLP_CLASSES)
    cm_df.to_csv(OUTPUT_DIR / 'confusion_matrix_nlp.csv')
    logger.info("Matrice de confusion sauvegardée dans %s", OUTPUT_DIR)

    # 2. Top mots par classe (coefficients de la régression logistique)
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_  # shape (n_classes, n_features)

    top_n = 20
    for i, classe in enumerate(NLP_CLASSES):
        coeff = coefs[i]
        top_indices = np.argsort(np.abs(coeff))[-top_n:][::-1]
        top_words = [feature_names[idx] for idx in top_indices]
        top_scores = [coeff[idx] for idx in top_indices]

        plt.figure(figsize=(8, 6))
        plt.barh(top_words, top_scores, color=sns.color_palette("Blues_d", top_n))
        plt.xlabel('Coefficient')
        plt.title(f'Top {top_n} mots les plus influents - Classe {classe}')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / f'top_words_{classe}.png', dpi=150)
        plt.close()
        logger.info("Top mots pour la classe %s sauvegardés.", classe)

    # ============ FIN VISUALISATIONS ============

    # Création d'un label encoder pour l'inférence (mapping numérique → nom)
    label_encoder = LabelEncoder()
    label_encoder.fit(NLP_CLASSES)

    metrics = {
        "f1_macro":              float(f1),
        "classification_report": report,
        "confusion_matrix":      cm.tolist(),
    }

    return vectorizer, model, label_encoder, metrics

# ─────────────────────────────────────────────
# PHASE 2 — XLM-ROBERTA (MIGRATION FUTURE)
# ─────────────────────────────────────────────

def train_xlm_roberta_pipeline(
    X_train,
    y_train,
    X_test,
    y_test,
) -> tuple:
    """
    Entraîne XLM-RoBERTa fine-tuné sur les 7 classes.
    Activé via USE_XLM_ROBERTA=True dans config.py.

    ARCHITECTURE IDENTIQUE à la Phase 1 du point de vue FastAPI :
    - Entrée : texte brut (str)
    - Sortie : probabilités sur les 7 classes (np.ndarray)
    L'interface predict_nlp.py ne change pas lors de la migration.

    Returns:
        (tokenizer, model, label_encoder, metrics_dict)
    """
    logger.info("=== PHASE 2 : XLM-RoBERTa FINE-TUNING ===")

    try:
        import torch
        from transformers import (
            AutoModelForSequenceClassification,
            AutoTokenizer,
            Trainer,
            TrainingArguments,
        )
        from torch.utils.data import Dataset as TorchDataset
    except ImportError as e:
        raise ImportError(
            "PyTorch et transformers sont requis pour XLM-RoBERTa. "
            "Installez-les : pip install torch transformers"
        ) from e

    from utils.config import (
        XLM_BATCH_SIZE,
        XLM_EPOCHS,
        XLM_LEARNING_RATE,
        XLM_MAX_LENGTH,
        XLM_MODEL_DIR,
        XLM_MODEL_NAME,
    )

    label_encoder = LabelEncoder()
    label_encoder.fit(list(range(len(NLP_CLASSES))))

    tokenizer = AutoTokenizer.from_pretrained(XLM_MODEL_NAME)

    # Dataset PyTorch
    class MentalHealthDataset(TorchDataset):
        def __init__(self, texts, labels):
            self.encodings = tokenizer(
                list(texts),
                truncation=True,
                padding=True,
                max_length=XLM_MAX_LENGTH,
            )
            self.labels = list(labels)

        def __getitem__(self, idx):
            item = {k: torch.tensor(v[idx]) for k, v in self.encodings.items()}
            item["labels"] = torch.tensor(self.labels[idx])
            return item

        def __len__(self):
            return len(self.labels)

    train_dataset = MentalHealthDataset(X_train, y_train)
    eval_dataset  = MentalHealthDataset(X_test, y_test)

    model = AutoModelForSequenceClassification.from_pretrained(
        XLM_MODEL_NAME,
        num_labels=len(NLP_CLASSES),
    )

    training_args = TrainingArguments(
        output_dir=str(XLM_MODEL_DIR),
        num_train_epochs=XLM_EPOCHS,
        per_device_train_batch_size=XLM_BATCH_SIZE,
        per_device_eval_batch_size=XLM_BATCH_SIZE,
        learning_rate=XLM_LEARNING_RATE,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        logging_dir=str(XLM_MODEL_DIR / "logs"),
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
    )

    trainer.train()

    # Évaluation
    predictions_output = trainer.predict(eval_dataset)
    y_pred = np.argmax(predictions_output.predictions, axis=-1)
    f1 = f1_score(y_test, y_pred, average="macro")
    report = classification_report(y_test, y_pred, target_names=NLP_CLASSES, zero_division=0)

    logger.info("XLM-RoBERTa — F1-Score Macro : %.4f", f1)
    logger.info(report)

    # Sauvegarde HuggingFace (en plus du joblib pour le tokenizer)
    XLM_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(XLM_MODEL_DIR))
    tokenizer.save_pretrained(str(XLM_MODEL_DIR))
    logger.info("Modèle XLM-RoBERTa sauvegardé dans %s", XLM_MODEL_DIR)

    metrics = {
        "f1_macro":              float(f1),
        "classification_report": report,
    }

    return tokenizer, model, label_encoder, metrics


# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

def run_training() -> dict:
    """
    Lance le pipeline NLP complet selon la configuration USE_XLM_ROBERTA.

    Returns:
        Dictionnaire des métriques finales.
    """
    # 1. Chargement et prétraitement
    logger.info("=== CHARGEMENT DU DATASET NLP ===")
    df = load_nlp_dataset()
    X_train, X_test, y_train, y_test = get_train_test_split(df)

    # 2. Entraînement selon la phase
    if USE_XLM_ROBERTA:
        logger.info("Mode XLM-RoBERTa activé (USE_XLM_ROBERTA=True)")
        # Pour XLM-RoBERTa, utiliser les textes avec nettoyage minimal (text_bert)
        df_train = df.loc[X_train.index].copy()
        df_test  = df.loc[X_test.index].copy()
        X_train_bert = df_train["text_bert"]
        X_test_bert  = df_test["text_bert"]

        _, model, label_encoder, metrics = train_xlm_roberta_pipeline(
            X_train_bert, y_train, X_test_bert, y_test
        )
        # Pour XLM-RoBERTa, on n'utilise pas de vectorizer TF-IDF
        # La sauvegarde joblib ne stocke que le label_encoder
        # Le modèle HF est sauvegardé dans XLM_MODEL_DIR
        from utils.model_loader import save_artifact
        from utils.config import LABEL_ENCODER_NLP, MODEL_NLP_PATH, VECTORIZER_NLP_PATH
        save_artifact(label_encoder, LABEL_ENCODER_NLP)
        save_artifact({"mode": "xlm_roberta"}, MODEL_NLP_PATH)
        save_artifact({"mode": "xlm_roberta"}, VECTORIZER_NLP_PATH)

    else:
        logger.info("Mode TF-IDF + Régression Logistique (USE_XLM_ROBERTA=False)")
        vectorizer, model, label_encoder, metrics = train_tfidf_pipeline(
            X_train, y_train, X_test, y_test
        )
        # 3. Sauvegarde joblib
        save_nlp(
            model=model,
            vectorizer=vectorizer,
            label_encoder=label_encoder,
        )

    logger.info("=== ENTRAÎNEMENT NLP TERMINÉ ===")
    return metrics


if __name__ == "__main__":
    run_training()
