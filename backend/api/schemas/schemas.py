"""
api/schemas/schemas.py — Schémas Pydantic conformes aux 6 tables
"""

from __future__ import annotations
import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nom:          str      = Field(..., min_length=2, max_length=100)
    prenom:       str      = Field(..., min_length=2, max_length=100)
    email:        EmailStr
    mot_de_passe: str      = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:        EmailStr
    mot_de_passe: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"

class UtilisateurResponse(BaseModel):
    id_utilisateur: int
    nom:            str
    prenom:         str
    email:          str
    est_actif:      bool
    cree_le:        datetime.datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# ENTRÉE JOURNALIÈRE
# ─────────────────────────────────────────────

class EntreeJournaliereSchema(BaseModel):
    heures_sommeil:     float = Field(..., ge=0, le=24)
    stress_level:       float = Field(..., ge=0, le=10)
    anxiety_level:      float = Field(..., ge=0, le=10)
    social_media_hours: float = Field(0.0,  ge=0, le=24)
    physical_activity:  float = Field(0.0,  ge=0, le=10)
    family_history:     float = Field(0.0,  ge=0, le=1)
    coping_struggles:   float = Field(0.0,  ge=0, le=1)
    mood_swings:        float = Field(0.0,  ge=0, le=10)
    days_indoors:       float = Field(0.0,  ge=0, le=7)
    texte_journal:      Optional[str] = Field(None, max_length=5000)


# ─────────────────────────────────────────────
# PRÉDICTION
# ─────────────────────────────────────────────

class PredictionRequest(BaseModel):
    entrees: list[EntreeJournaliereSchema] = Field(
        ..., min_length=7, max_length=7
    )

    @field_validator("entrees")
    @classmethod
    def check_sept_entrees(cls, v):
        if len(v) != 7:
            raise ValueError("Exactement 7 entrées journalières sont requises.")
        return v


class DetailsResultat(BaseModel):
    score_comportemental: float
    score_nlp:            float
    alpha_utilise:        float
    classe_nlp:           str
    probabilites_nlp:     dict[str, float]
    label_comportemental: str


class PredictionResponse(BaseModel):
    score_final:       float
    niveau_risque:     str
    message_fr:        str
    signal_suicidaire: bool
    details:           DetailsResultat


# ─────────────────────────────────────────────
# HISTORIQUE
# ─────────────────────────────────────────────

class ResultatHistorique(BaseModel):
    id_evaluation:        int
    date_evaluation:      Optional[datetime.datetime]
    nb_jours:             int
    score_final:          Optional[float]
    niveau_risque:        Optional[str]
    classe_nlp:           Optional[str]
    signal_suicidaire:    bool
    score_comportemental: Optional[float]
    score_nlp:            Optional[float]

    model_config = {"from_attributes": True}


class HistoriqueResponse(BaseModel):
    total:     int
    resultats: list[ResultatHistorique]


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────

class HealthResponse(BaseModel):
    statut:          str
    modeles:         dict[str, bool]
    base_de_donnees: bool