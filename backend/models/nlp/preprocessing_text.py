"""
preprocessing_text.py — Prétraitement des textes pour le pipeline NLP.
Conçu pour supporter TF-IDF (Phase 1) ET XLM-RoBERTa (migration future)
sans refonte architecturale.
Les utilisateurs saisissent leurs journaux en FRANÇAIS.
Combined_Data.csv est en anglais → le modèle apprend des patterns anglais,
mais XLM-RoBERTa sera multilingue et couvrira le français nativement.
"""

import logging
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from utils.config import (
    CSV_NLP,
    MAX_TEXT_LENGTH,
    NLP_CLASSES,
    TARGET_NLP,
    RANDOM_STATE,
    TEST_SIZE,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# STOPWORDS FRANÇAIS ET ANGLAIS (inline, sans dépendance NLTK obligatoire)
# ─────────────────────────────────────────────
STOPWORDS_FR = {
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "est", "en",
    "au", "aux", "ce", "se", "sa", "son", "ses", "mon", "ma", "mes", "ton",
    "ta", "tes", "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
    "que", "qui", "quoi", "dont", "où", "ne", "pas", "plus", "très", "aussi",
    "mais", "ou", "donc", "or", "ni", "car", "si", "sur", "sous", "dans",
    "avec", "sans", "pour", "par", "entre", "vers", "chez", "lors", "depuis",
    "avant", "après", "pendant", "comme", "même", "encore", "bien", "tout",
    "déjà", "puis", "alors", "cela", "cet", "cette", "tous", "toutes", "être",
    "avoir", "faire", "aller", "venir", "voir", "dire", "pouvoir", "vouloir",
}

STOPWORDS_EN = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
    "your", "yours", "yourself", "he", "him", "his", "she", "her", "hers",
    "it", "its", "they", "them", "their", "what", "which", "who", "this",
    "that", "these", "those", "am", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "a", "an",
    "the", "and", "but", "or", "nor", "for", "so", "yet", "both", "either",
    "neither", "not", "only", "same", "than", "then", "when", "where",
    "while", "of", "at", "by", "from", "up", "about", "into", "through",
    "to", "in", "on", "with", "as", "if", "after", "before", "because",
    "until", "although", "though", "since", "once", "just", "also", "very",
    "too", "more", "most", "any", "each", "every", "few", "no", "nor",
}

ALL_STOPWORDS = STOPWORDS_FR | STOPWORDS_EN


# ─────────────────────────────────────────────
# NETTOYAGE DE BASE
# ─────────────────────────────────────────────

def normalize_unicode(text: str) -> str:
    """Normalise les caractères Unicode (NFC) et supprime les caractères de contrôle."""
    text = unicodedata.normalize("NFC", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Cc")
    return text


def remove_urls(text: str) -> str:
    """Supprime les URLs."""
    return re.sub(r"https?://\S+|www\.\S+", " ", text)


def remove_mentions_hashtags(text: str) -> str:
    """Supprime les mentions (@user) et hashtags (#tag) typiques des réseaux sociaux."""
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#\w+", " ", text)
    return text


def remove_special_chars(text: str) -> str:
    """
    Supprime la ponctuation et les caractères spéciaux.
    Conserve les apostrophes pour préserver les contractions françaises.
    """
    text = re.sub(r"[^a-zA-ZÀ-ÿ\s']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def lowercase(text: str) -> str:
    return text.lower()


def remove_stopwords(text: str, stopwords: set = ALL_STOPWORDS) -> str:
    """Supprime les stopwords français et anglais."""
    tokens = text.split()
    tokens = [t for t in tokens if t not in stopwords and len(t) > 1]
    return " ".join(tokens)


def truncate_text(text: str, max_words: int = MAX_TEXT_LENGTH) -> str:
    """Tronque le texte à max_words tokens (pour TF-IDF et BERT)."""
    tokens = text.split()
    if len(tokens) > max_words:
        tokens = tokens[:max_words]
    return " ".join(tokens)


# ─────────────────────────────────────────────
# PIPELINE DE NETTOYAGE UNIFIÉ
# ─────────────────────────────────────────────

def clean_text(
    text: str,
    remove_stops: bool = True,
    max_words: int = MAX_TEXT_LENGTH,
) -> str:
    """
    Pipeline de nettoyage complet pour un texte journal.
    Compatible avec TF-IDF (Phase 1) et XLM-RoBERTa (migration future).

    Args:
        text:          Texte brut (français ou anglais).
        remove_stops:  Supprimer les stopwords (True pour TF-IDF,
                       False recommandé pour BERT qui gère lui-même le contexte).
        max_words:     Nombre maximum de tokens à conserver.

    Returns:
        Texte nettoyé sous forme de chaîne.
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    text = normalize_unicode(text)
    text = remove_urls(text)
    text = remove_mentions_hashtags(text)
    text = lowercase(text)
    text = remove_special_chars(text)

    if remove_stops:
        text = remove_stopwords(text)

    text = truncate_text(text, max_words=max_words)
    return text


def clean_text_for_bert(text: str) -> str:
    """
    Nettoyage minimal adapté à XLM-RoBERTa :
    - Garde la ponctuation (le tokenizer BERT la gère)
    - Ne supprime PAS les stopwords (le contexte est important pour l'attention)
    - Normalise Unicode et supprime URLs/mentions uniquement
    Point d'entrée dédié pour faciliter la migration (Phase 2).
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    text = normalize_unicode(text)
    text = remove_urls(text)
    text = remove_mentions_hashtags(text)
    text = lowercase(text)
    text = truncate_text(text, max_words=MAX_TEXT_LENGTH)
    return text


# ─────────────────────────────────────────────
# CHARGEMENT ET PRÉPARATION DU DATASET NLP
# ─────────────────────────────────────────────

def load_nlp_dataset(path=CSV_NLP) -> pd.DataFrame:
    """
    Charge Combined_Data.csv et applique le nettoyage de texte.

    Returns:
        DataFrame avec colonnes 'text_clean' et 'label' (entier).
    """
    logger.info("Chargement du dataset NLP : %s", path)
    df = pd.read_csv(path)

    # Uniformisation des noms de colonnes (variations possibles selon la version Kaggle)
    if "statement" in df.columns:
        df = df.rename(columns={"statement": "text"})
    elif "text" not in df.columns:
        # Chercher la colonne textuelle (heuristique : plus longue chaîne moyenne)
        text_col = max(
            df.select_dtypes(include="object").columns,
            key=lambda c: df[c].dropna().str.len().mean(),
        )
        df = df.rename(columns={text_col: "text"})

    if TARGET_NLP not in df.columns:
        raise ValueError(
            f"Colonne cible '{TARGET_NLP}' introuvable. "
            f"Colonnes disponibles : {df.columns.tolist()}"
        )

    # Suppression des lignes sans texte ou sans label
    df = df.dropna(subset=["text", TARGET_NLP])
    df["text"] = df["text"].astype(str)

    logger.info("Lignes après nettoyage NaN : %d", len(df))

    # Application du nettoyage
    logger.info("Application du pipeline de nettoyage texte…")
    df["text_clean"] = df["text"].apply(lambda t: clean_text(t, remove_stops=True))
    df["text_bert"]  = df["text"].apply(clean_text_for_bert)  # pour migration XLM-RoBERTa

    # Suppression des textes vides après nettoyage
    df = df[df["text_clean"].str.len() > 0]

    # Encodage numérique des labels
    label_map = {cls: idx for idx, cls in enumerate(NLP_CLASSES)}
    df["label"] = df[TARGET_NLP].map(label_map)
    df = df.dropna(subset=["label"])
    df["label"] = df["label"].astype(int)

    logger.info(
        "Dataset NLP prêt : %d lignes | Distribution labels :\n%s",
        len(df),
        df[TARGET_NLP].value_counts().to_string(),
    )
    return df


def get_train_test_split(df: pd.DataFrame) -> tuple:
    """
    Effectue un split stratifié train/test.

    Returns:
        X_train, X_test, y_train, y_test (Series de textes et entiers)
    """
    from sklearn.model_selection import train_test_split

    X = df["text_clean"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    logger.info(
        "Split : train=%d | test=%d", len(X_train), len(X_test)
    )
    return X_train, X_test, y_train, y_test


# ─────────────────────────────────────────────
# PRÉTRAITEMENT D'UNE ENTRÉE UTILISATEUR (inférence)
# ─────────────────────────────────────────────

def preprocess_user_input(
    texts: list[str],
    for_bert: bool = False,
) -> list[str]:
    """
    Prétraite les textes libres saisis par l'utilisateur (journaux quotidiens).
    Concatène les 7 journaux en un seul texte pour l'inférence.

    Args:
        texts:    Liste de textes (un par jour).
        for_bert: Si True, utilise le nettoyage minimal pour XLM-RoBERTa.

    Returns:
        Liste de textes nettoyés (un par journal) ou texte concaténé.
    """
    cleaner = clean_text_for_bert if for_bert else clean_text

    cleaned = []
    for text in texts:
        c = cleaner(text)
        if c:
            cleaned.append(c)

    return cleaned


def concatenate_weekly_texts(texts: list[str], for_bert: bool = False) -> str:
    """
    Concatène les 7 journaux quotidiens en un seul texte pour l'inférence NLP.
    Séparateur : ' [SEP] ' (reconnu par les tokenizers BERT si présent).

    Args:
        texts:    Liste de 7 textes bruts (journaux en français).
        for_bert: Si True, utilise le nettoyage minimal pour XLM-RoBERTa.

    Returns:
        Texte unique concatené et nettoyé.
    """
    cleaned = preprocess_user_input(texts, for_bert=for_bert)
    separator = " [SEP] " if for_bert else " "
    combined = separator.join(cleaned)
    return truncate_text(combined, max_words=MAX_TEXT_LENGTH)
