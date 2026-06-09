import logging
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Evaluation, Prediction
from utils.config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

# Modèles Pydantic
class ChatOuvrirResponse(BaseModel):
    reponse: str

class ChatRequest(BaseModel):
    id_evaluation: int
    historique: List[Dict[str, str]]
    message_utilisateur: str

class ChatResponse(BaseModel):
    reponse: str

def call_mistral(messages: List[Dict[str, str]]) -> str:
    """Appelle l'API Mistral AI avec une liste de messages au format OpenAI."""
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistral-small-latest",
        "messages": messages,
        "max_tokens": 350,
        "temperature": 0.7
    }
    try:
        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=15
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Erreur Mistral: {e}")
        raise HTTPException(status_code=500, detail="Le service de conversation est temporairement indisponible.")

@router.post("/ouvrir", response_model=ChatOuvrirResponse)
def ouvrir_conversation(id_evaluation: int, db: Session = Depends(get_db)):
       # ICI, id_evaluation est un paramètre de la fonction
    logger.info(f"Récupération évaluation {id_evaluation}")
    # Récupérer l'évaluation
    evaluation = db.query(Evaluation).filter(Evaluation.id_evaluation == id_evaluation).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation non trouvée")

    # Récupérer la dernière prédiction associée
    prediction = db.query(Prediction).filter(Prediction.id_evaluation == id_evaluation).order_by(Prediction.date_prediction.desc()).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Aucune prédiction trouvée pour cette évaluation")

    niveau = prediction.niveau_risque      # 'faible', 'modere', 'eleve'
    score  = prediction.score_final
    # Ici, les facteurs SHAP ne sont pas encore stockés. Tu peux soit ajouter une colonne dans Prediction,
    # soit mettre une liste vide pour l'instant.
    facteurs = []  # À remplacer par prediction.facteurs_shap si tu ajoutes la colonne

    system_prompt = f"""Tu es un assistant bienveillant spécialisé dans le soutien émotionnel des étudiants en Afrique francophone.
Contexte : l'étudiant vient de compléter une évaluation de santé mentale sur 7 jours.
Niveau de risque : {niveau}
Score final : {score}
Facteurs principaux détectés : {', '.join(facteurs) if facteurs else 'non spécifiés'}

RÈGLES À RESPECTER IMPÉRATIVEMENT :
1. Tu ne poses JAMAIS de diagnostic médical.
2. Tu parles en français simple et chaleureux.
3. Tu poses UNE seule question à la fois.
4. Tu écoutes avant de conseiller.
5. Si l'utilisateur mentionne le suicide → redirige IMMÉDIATEMENT vers le SAMU : 185.

Orientation selon le risque :
- Faible → conseils bien-être + techniques de relaxation.
- Modéré → psychologue scolaire + médecin généraliste.
- Élevé → consultation urgente + SAMU 185.

Commence toujours par une phrase empathique basée sur les facteurs détectés — pas un message générique. Ne mentionne jamais le score chiffré. Reste chaleureux et soutenant."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"L'utilisateur a terminé son évaluation. Son niveau de risque est {niveau}. Facteurs: {', '.join(facteurs) if facteurs else 'aucun facteur spécifique'}. Commence la conversation."}
    ]

    reponse = call_mistral(messages)
    return ChatOuvrirResponse(reponse=reponse)

@router.post("", response_model=ChatResponse)
def converser(request: ChatRequest, db: Session = Depends(get_db)):
    evaluation = db.query(Evaluation).filter(Evaluation.id_evaluation == request.id_evaluation).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation non trouvée")

    prediction = db.query(Prediction).filter(Prediction.id_evaluation == request.id_evaluation).order_by(Prediction.date_prediction.desc()).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Aucune prédiction trouvée")

    niveau = prediction.niveau_risque
    facteurs = []  # idem

    system_prompt = f"""Tu es un assistant bienveillant spécialisé dans le soutien émotionnel des étudiants en Afrique francophone.
Contexte : l'étudiant a un niveau de risque {niveau}. Facteurs: {', '.join(facteurs) if facteurs else 'non spécifiés'}.

RÈGLES :
1. Pas de diagnostic médical.
2. Français simple et chaleureux.
3. Une seule question à la fois.
4. Écoute avant de conseiller.
5. Si mention du suicide → redirige vers SAMU 185.

Orientation selon le risque : {niveau} → (faible: bien-être, modéré: psychologue, élevé: urgence)."""

    messages = [{"role": "system", "content": system_prompt}]

    for msg in request.historique:
        role = msg.get("role")
        if role in ["user", "assistant"]:
            messages.append({"role": role, "content": msg["content"]})

    messages.append({"role": "user", "content": request.message_utilisateur})

    reponse = call_mistral(messages)
    return ChatResponse(reponse=reponse)