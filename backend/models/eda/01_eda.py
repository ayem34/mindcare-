"""
01_eda.py — Exploration et Analyse des Données (EDA)
Analyse visuelle des 3 datasets : Teen_Mental_Health, Mental_Health_Dataset, Combined_Data
Génère des graphiques dans outputs/eda/
Exécuter : python -m models.eda.01_eda
"""

import logging
import sys
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import numpy as np
import pandas as pd
import seaborn as sns

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from utils.config import CSV_ADULTS, CSV_NLP, CSV_TEEN, NLP_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Dossier de sortie ──────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).resolve().parents[2].parent / "outputs" / "eda"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Palette commune ────────────────────────────────────────────────────────
PALETTE = "Blues_d"
sns.set_theme(style="whitegrid", palette=PALETTE, font_scale=1.1)


# ══════════════════════════════════════════════════════════════════════════════
# DATASET 1 — Teen_Mental_Health.csv
# ══════════════════════════════════════════════════════════════════════════════

def eda_teen():
    logger.info("=== EDA — Teen_Mental_Health.csv ===")
    df = pd.read_csv(CSV_TEEN)
    logger.info("Shape : %s", df.shape)
    logger.info("Types :\n%s", df.dtypes)
    logger.info("Valeurs manquantes :\n%s", df.isnull().sum())
    logger.info("Statistiques descriptives :\n%s", df.describe())

    # 1. Distribution de la variable cible
    fig, ax = plt.subplots(figsize=(6, 4))
    target_counts = df["depression_label"].value_counts()
    bars = ax.bar(
        ["Sain (0)", "Dépressif (1)"],
        target_counts.values,
        color=["#5B9BD5", "#ED7D31"],
        edgecolor="white",
        linewidth=1.5,
    )
    for bar, val in zip(bars, target_counts.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 10,
                f"{val}\n({val/len(df)*100:.1f}%)", ha="center", fontsize=11)
    ax.set_title("Teen — Distribution de la variable cible (depression_label)", fontweight="bold")
    ax.set_ylabel("Nombre d'individus")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "teen_01_target_distribution.png", dpi=150)
    plt.close()
    logger.info("⚠️  Déséquilibre sévère : %d positifs / %d négatifs",
                target_counts.get(1, 0), target_counts.get(0, 0))

    # 2. Distributions des features numériques
    num_cols = [c for c in ["heures_sommeil", "stress_level", "anxiety_level",
                             "daily_social_media_hours", "physical_activity"]
                if c in df.columns]
    if num_cols:
        fig, axes = plt.subplots(1, len(num_cols), figsize=(4 * len(num_cols), 4))
        if len(num_cols) == 1:
            axes = [axes]
        for ax, col in zip(axes, num_cols):
            for label, color in [(0, "#5B9BD5"), (1, "#ED7D31")]:
                subset = df[df["depression_label"] == label][col].dropna()
                ax.hist(subset, bins=20, alpha=0.6, color=color,
                        label=f"{'Sain' if label == 0 else 'Dépressif'}")
            ax.set_title(col, fontsize=10)
            ax.legend(fontsize=8)
        fig.suptitle("Teen — Distribution des features par classe", fontweight="bold")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "teen_02_feature_distributions.png", dpi=150)
        plt.close()

    # 3. Matrice de corrélation
    num_df = df.select_dtypes(include=[np.number])
    if len(num_df.columns) > 1:
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(num_df.corr(), annot=True, fmt=".2f", cmap="coolwarm",
                    center=0, ax=ax, linewidths=0.5)
        ax.set_title("Teen — Matrice de corrélation", fontweight="bold")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "teen_03_correlation_matrix.png", dpi=150)
        plt.close()

    logger.info("✅ EDA Teen terminée — graphiques dans %s", OUTPUT_DIR)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# DATASET 2 — Mental_Health_Dataset.csv (Adultes)
# ══════════════════════════════════════════════════════════════════════════════

def eda_adults():
    logger.info("=== EDA — Mental_Health_Dataset.csv (Adultes) ===")
    df = pd.read_csv(CSV_ADULTS)
    logger.info("Shape : %s", df.shape)
    logger.info("Valeurs manquantes :\n%s", df.isnull().sum())

    # 1. Distribution de la cible (treatment)
    fig, ax = plt.subplots(figsize=(6, 4))
    counts = df["treatment"].value_counts()
    bars = ax.bar(counts.index, counts.values,
                  color=["#5B9BD5", "#ED7D31"], edgecolor="white", linewidth=1.5)
    for bar, val in zip(bars, counts.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 200,
                f"{val}\n({val/len(df)*100:.1f}%)", ha="center", fontsize=11)
    ax.set_title("Adultes — Distribution de la variable cible (treatment)", fontweight="bold")
    ax.set_ylabel("Nombre d'individus")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "adults_01_target_distribution.png", dpi=150)
    plt.close()

    # 2. Distribution par features clés (catégorielles Yes/No)
    cat_cols = [c for c in ["Growing_Stress", "Mood_Swings", "Coping_Struggles",
                             "family_history", "Days_Indoors"] if c in df.columns]
    if cat_cols:
        fig, axes = plt.subplots(1, min(len(cat_cols), 3), figsize=(15, 5))
        if len(cat_cols) == 1:
            axes = [axes]
        for ax, col in zip(axes, cat_cols[:3]):
            ct = pd.crosstab(df[col], df["treatment"], normalize="index") * 100
            ct.plot(kind="bar", ax=ax, color=["#5B9BD5", "#ED7D31"],
                    edgecolor="white", rot=0)
            ax.set_title(col, fontsize=10)
            ax.yaxis.set_major_formatter(mtick.PercentFormatter())
            ax.set_ylabel("% traitement")
            ax.legend(title="treatment", fontsize=8)
        fig.suptitle("Adultes — Features clés vs traitement (%)", fontweight="bold")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "adults_02_features_vs_target.png", dpi=150)
        plt.close()

    # 3. Boxplot stress vs treatment (si colonne numérique disponible)
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if num_cols:
        fig, ax = plt.subplots(figsize=(8, 5))
        df_plot = df[[num_cols[0], "treatment"]].dropna()
        df_plot.boxplot(column=num_cols[0], by="treatment", ax=ax,
                        boxprops=dict(color="#5B9BD5"),
                        medianprops=dict(color="#ED7D31", linewidth=2))
        ax.set_title(f"Adultes — {num_cols[0]} par traitement")
        plt.suptitle("")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "adults_03_boxplot.png", dpi=150)
        plt.close()

    logger.info("✅ EDA Adultes terminée — graphiques dans %s", OUTPUT_DIR)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# DATASET 3 — Combined_Data.csv (NLP — 7 classes)
# ══════════════════════════════════════════════════════════════════════════════

def eda_nlp():
    logger.info("=== EDA — Combined_Data.csv (NLP) ===")
    df = pd.read_csv(CSV_NLP)

    # Normalisation du nom des colonnes
    if "statement" in df.columns:
        df = df.rename(columns={"statement": "text"})

    logger.info("Shape : %s", df.shape)
    logger.info("Distribution des classes :\n%s", df["status"].value_counts())

    # 1. Distribution des 7 classes
    fig, ax = plt.subplots(figsize=(10, 5))
    counts = df["status"].value_counts()
    colors = sns.color_palette("Blues_d", len(counts))
    bars = ax.barh(counts.index, counts.values, color=colors[::-1], edgecolor="white")
    for bar, val in zip(bars, counts.values):
        ax.text(val + 100, bar.get_y() + bar.get_height() / 2,
                f"{val:,} ({val/len(df)*100:.1f}%)",
                va="center", fontsize=9)
    ax.set_title("NLP — Distribution des 7 classes de troubles mentaux", fontweight="bold")
    ax.set_xlabel("Nombre de textes")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "nlp_01_class_distribution.png", dpi=150)
    plt.close()

    # 2. Distribution de la longueur des textes par classe
    df["text_len"] = df["text"].fillna("").astype(str).apply(lambda x: len(x.split()))
    fig, ax = plt.subplots(figsize=(12, 5))
    order = df.groupby("status")["text_len"].median().sort_values(ascending=False).index
    sns.boxplot(data=df, x="status", y="text_len", order=order,
                palette="Blues_d", ax=ax, showfliers=False)
    ax.set_title("NLP — Longueur des textes par classe (mots)", fontweight="bold")
    ax.set_xlabel("Classe")
    ax.set_ylabel("Nombre de mots")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "nlp_02_text_length_by_class.png", dpi=150)
    plt.close()

    # 3. Top 20 mots par classe (heuristique simple sans NLTK obligatoire)
    from collections import Counter
    import re

    STOPWORDS = {"i", "me", "my", "the", "a", "an", "and", "or", "is", "it",
                 "to", "of", "in", "that", "was", "for", "on", "are", "with",
                 "as", "at", "this", "be", "by", "not", "but", "have", "had",
                 "so", "do", "we", "he", "she", "they", "you", "just", "from",
                 "feel", "like", "really", "very", "been", "would", "can", "get",
                 "know", "about", "what", "when", "all", "no", "up", "out", "if",
                 "there", "more", "has", "his", "her", "their", "than"}

    classes_to_plot = ["Depression", "Suicidal", "Anxiety", "Normal"]
    classes_to_plot = [c for c in classes_to_plot if c in df["status"].unique()]

    fig, axes = plt.subplots(1, len(classes_to_plot), figsize=(5 * len(classes_to_plot), 5))
    if len(classes_to_plot) == 1:
        axes = [axes]

    for ax, cls in zip(axes, classes_to_plot):
        # Convertir en string et gérer les valeurs manquantes
        texts = df[df["status"] == cls]["text"].fillna("").astype(str).str.lower()
        words = []
        for t in texts:
            # t est déjà une chaîne, mais on vérifie par sécurité
            if isinstance(t, str):
                words.extend(re.findall(r"\b[a-z]{3,}\b", t))
        words = [w for w in words if w not in STOPWORDS]
        top = Counter(words).most_common(15)
        if top:
            words_list, counts = zip(*top)
            ax.barh(words_list[::-1], counts[::-1],
                    color=sns.color_palette("Blues_d", 15))
            ax.set_title(f"Top mots — {cls}", fontsize=10, fontweight="bold")
            ax.set_xlabel("Fréquence")

    fig.suptitle("NLP — Top 15 mots par classe (hors stopwords)", fontweight="bold")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "nlp_03_top_words_per_class.png", dpi=150)
    plt.close()

    logger.info("✅ EDA NLP terminée — graphiques dans %s", OUTPUT_DIR)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ GLOBAL
# ══════════════════════════════════════════════════════════════════════════════

def print_summary(df_teen, df_adults, df_nlp):
    logger.info("\n" + "=" * 60)
    logger.info("RÉSUMÉ GLOBAL DES 3 DATASETS")
    logger.info("=" * 60)
    logger.info("Teen_Mental_Health   : %7d lignes × %d colonnes", *df_teen.shape)
    logger.info("Mental_Health_Dataset: %7d lignes × %d colonnes", *df_adults.shape)
    logger.info("Combined_Data (NLP)  : %7d lignes × %d colonnes", *df_nlp.shape)
    logger.info("=" * 60)
    logger.info("Graphiques sauvegardés dans : %s", OUTPUT_DIR)
    logger.info("Fichiers générés :")
    for f in sorted(OUTPUT_DIR.glob("*.png")):
        logger.info("  → %s", f.name)


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

def run_eda():
    df_teen   = eda_teen()
    df_adults = eda_adults()
    df_nlp    = eda_nlp()
    print_summary(df_teen, df_adults, df_nlp)


if __name__ == "__main__":
    run_eda()
