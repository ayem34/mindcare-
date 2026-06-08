"""
database/models.py — Modèles SQLAlchemy
6 tables conformes au cahier technique (Tableau 23) :
  utilisateurs, evaluations, entrees_quotidiennes,
  textes_libres, predictions, audit_log
"""

import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


# ─────────────────────────────────────────────
# TABLE 1 — utilisateurs
# ─────────────────────────────────────────────
class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id_utilisateur  = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(100), nullable=False)
    prenom          = Column(String(100), nullable=False)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    mot_de_passe    = Column(String(255), nullable=False)          # bcrypt hash
    date_naissance  = Column(DateTime, nullable=True)
    est_actif       = Column(Boolean, default=True)
    est_admin       = Column(Boolean, default=False)
    cree_le         = Column(DateTime, default=datetime.datetime.utcnow)

    # Relations
    evaluations     = relationship("Evaluation",  back_populates="utilisateur", cascade="all, delete")
    audit_logs      = relationship("AuditLog",    back_populates="utilisateur", cascade="all, delete")


# ─────────────────────────────────────────────
# TABLE 2 — evaluations (session de 7 jours)
# ─────────────────────────────────────────────
class Evaluation(Base):
    __tablename__ = "evaluations"

    id_evaluation   = Column(Integer, primary_key=True, index=True)
    id_utilisateur  = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"), nullable=False)
    date_debut      = Column(DateTime, default=datetime.datetime.utcnow)
    date_fin        = Column(DateTime, nullable=True)
    statut          = Column(String(20), default="en_cours")   # en_cours / terminee
    nb_jours_saisis = Column(Integer, default=0)               # 0 à 7

    # Relations
    utilisateur         = relationship("Utilisateur",        back_populates="evaluations")
    entrees_quotidiennes = relationship("EntreeQuotidienne", back_populates="evaluation", cascade="all, delete")
    textes_libres        = relationship("TexteLibre",        back_populates="evaluation", cascade="all, delete")
    predictions          = relationship("Prediction",        back_populates="evaluation", cascade="all, delete")

# Index
Index("idx_eval_utilisateur", Evaluation.id_utilisateur)


# ─────────────────────────────────────────────
# TABLE 3 — entrees_quotidiennes
# ─────────────────────────────────────────────
class EntreeQuotidienne(Base):
    __tablename__ = "entrees_quotidiennes"

    id_entree           = Column(Integer, primary_key=True, index=True)
    id_evaluation       = Column(Integer, ForeignKey("evaluations.id_evaluation"), nullable=False)
    jour_numero         = Column(Integer, nullable=False)          # 1 à 7
    date_saisie         = Column(DateTime, default=datetime.datetime.utcnow)

    # Features comportementales (Teen + Adults datasets)
    heures_sommeil      = Column(Float, nullable=False)
    stress_level        = Column(Float, nullable=False)
    anxiety_level       = Column(Float, nullable=False)
    social_media_hours  = Column(Float, default=0.0)
    physical_activity   = Column(Float, default=0.0)
    family_history      = Column(Float, default=0.0)
    coping_struggles    = Column(Float, default=0.0)
    mood_swings         = Column(Float, default=0.0)
    days_indoors        = Column(Float, default=0.0)

    # Relation
    evaluation  = relationship("Evaluation",   back_populates="entrees_quotidiennes")
    texte_libre = relationship("TexteLibre",   back_populates="entree_quotidienne", uselist=False)

# Index
Index("idx_entree_eval", EntreeQuotidienne.id_evaluation)


# ─────────────────────────────────────────────
# TABLE 4 — textes_libres
# ─────────────────────────────────────────────
class TexteLibre(Base):
    __tablename__ = "textes_libres"

    id_texte            = Column(Integer, primary_key=True, index=True)
    id_entree           = Column(Integer, ForeignKey("entrees_quotidiennes.id_entree"), nullable=False)
    id_evaluation       = Column(Integer, ForeignKey("evaluations.id_evaluation"),     nullable=False)
    date_saisie         = Column(DateTime, default=datetime.datetime.utcnow)

    # Contenu brut et nettoyé
    texte_brut          = Column(Text, nullable=False)
    texte_nettoye       = Column(Text, nullable=True)

    # Résultats NLP (stockés après prédiction)
    classe_predite_nlp  = Column(String(50),  nullable=True)    # ex: "Depression"
    score_nlp           = Column(Float,       nullable=True)    # 1 - P(Normal)
    probabilites_nlp    = Column(JSON,        nullable=True)    # {classe: proba}
    signal_suicidaire   = Column(Boolean,     default=False)

    # Relations
    entree_quotidienne  = relationship("EntreeQuotidienne", back_populates="texte_libre")
    evaluation          = relationship("Evaluation",        back_populates="textes_libres")


# ─────────────────────────────────────────────
# TABLE 5 — predictions (résultats fusion)
# ─────────────────────────────────────────────
class Prediction(Base):
    __tablename__ = "predictions"

    id_prediction           = Column(Integer, primary_key=True, index=True)
    id_evaluation           = Column(Integer, ForeignKey("evaluations.id_evaluation"), nullable=False)
    date_prediction         = Column(DateTime, default=datetime.datetime.utcnow)

    # Scores des 2 modèles
    score_comportemental    = Column(Float, nullable=False)
    score_nlp               = Column(Float, nullable=False)
    alpha_utilise           = Column(Float, nullable=False)

    # Score de fusion
    score_final             = Column(Float, nullable=False)
    niveau_risque           = Column(String(20), nullable=False)  # faible / modere / eleve
    message_fr              = Column(Text,  nullable=True)

    # Détails
    classe_nlp              = Column(String(50),  nullable=True)
    label_comportemental    = Column(String(50),  nullable=True)
    signal_suicidaire       = Column(Boolean, default=False)
    probabilites_nlp        = Column(JSON,    nullable=True)

    # Relation
    evaluation  = relationship("Evaluation", back_populates="predictions")

# Index
Index("idx_pred_risque", Prediction.niveau_risque)


# ─────────────────────────────────────────────
# TABLE 6 — audit_log (traçabilité éthique)
# ─────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"

    id_audit        = Column(Integer, primary_key=True, index=True)
    id_utilisateur  = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"), nullable=True)
    horodatage      = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    action          = Column(String(100), nullable=False)   # ex: "prediction", "login", "register"
    details         = Column(JSON, nullable=True)           # contexte libre
    adresse_ip      = Column(String(50),  nullable=True)
    niveau_risque   = Column(String(20),  nullable=True)    # pour filtrage rapide
    signal_suicidaire = Column(Boolean,   default=False)

    # Relation
    utilisateur = relationship("Utilisateur", back_populates="audit_logs")

# Index
Index("idx_audit_horodatage", AuditLog.horodatage)
