"""
api/routes/historique.py — Historique via la table evaluations → predictions
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session


from backend.database.database import get_db                        
from backend.database.models import Utilisateur, Evaluation, Prediction  
from backend.api.routes.auth import get_current_user                

router = APIRouter(prefix="/historique", tags=["Historique"])


@router.get("")
def get_historique(
    page:     int = Query(1, ge=1),
    par_page: int = Query(10, ge=1, le=100),
    current_user: Utilisateur = Depends(get_current_user),
    db:           Session     = Depends(get_db),
):
    """Historique paginé — evaluations terminées avec leur prédiction."""
    query = (
        db.query(Evaluation)
        .filter(
            Evaluation.id_utilisateur == current_user.id_utilisateur,
            Evaluation.statut == "terminee",
        )
        .order_by(Evaluation.date_fin.desc())
    )
    total = query.count()
    evals = query.offset((page - 1) * par_page).limit(par_page).all()

    resultats = []
    for ev in evals:
        pred = ev.predictions[0] if ev.predictions else None
        resultats.append({
            "id_evaluation":        ev.id_evaluation,
            "date_evaluation":      ev.date_fin,
            "nb_jours":             ev.nb_jours_saisis,
            "score_final":          pred.score_final          if pred else None,
            "niveau_risque":        pred.niveau_risque        if pred else None,
            "classe_nlp":           pred.classe_nlp           if pred else None,
            "signal_suicidaire":    pred.signal_suicidaire    if pred else False,
            "score_comportemental": pred.score_comportemental if pred else None,
            "score_nlp":            pred.score_nlp            if pred else None,
        })

    return {"total": total, "resultats": resultats}


@router.get("/stats")
def get_stats(
    current_user: Utilisateur = Depends(get_current_user),
    db:           Session     = Depends(get_db),
):
    """Statistiques globales depuis la table predictions."""
    predictions = (
        db.query(Prediction)
        .join(Evaluation)
        .filter(Evaluation.id_utilisateur == current_user.id_utilisateur)
        .order_by(Prediction.date_prediction.desc())
        .all()
    )
    if not predictions:
        return {"total_predictions": 0, "score_moyen": None, "dernier_niveau": None}

    scores = [p.score_final for p in predictions]
    return {
        "total_predictions": len(predictions),
        "score_moyen":       round(sum(scores) / len(scores), 4),
        "score_min":         round(min(scores), 4),
        "score_max":         round(max(scores), 4),
        "dernier_niveau":    predictions[0].niveau_risque,
        "dernier_score":     predictions[0].score_final,
        "derniere_date":     predictions[0].date_prediction,
    }
