"""
api/routes/predict.py — Route POST /predict
Chaque texte journalier est analysé individuellement par predict_nlp()
avant la fusion globale sur 7 jours.
"""

import logging
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Utilisateur, Evaluation, EntreeQuotidienne, TexteLibre, Prediction, AuditLog
from backend.utils.model_loader import check_models_exist
from backend.models.fusion.predict_global import predict_global_from_raw
from backend.models.nlp.predict_nlp import predict_nlp
from backend.api.schemas.schemas import PredictionRequest, PredictionResponse
from backend.api.routes.auth import get_current_user


from deep_translator import GoogleTranslator
translator = GoogleTranslator(source='fr', target='en')

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Prédiction"])


def _save_full_evaluation(
    db:          Session,
    user_id:     int,
    request:     PredictionRequest,
    result:      dict,
    scores_nlp_par_jour: list[dict],   # ← résultats NLP individuels
    adresse_ip:  str = None,
) -> None:
    """
    Sauvegarde dans les 6 tables.
    scores_nlp_par_jour : liste de 7 dicts retournés par predict_nlp()
                          un par jour, dans l'ordre des entrées.
    """
    try:
        details = result.get("details", {})

        # ── 1. evaluations ───────────────────────────────────────────────
        evaluation = Evaluation(
            id_utilisateur   = user_id,
            date_debut       = datetime.datetime.utcnow(),
            date_fin         = datetime.datetime.utcnow(),
            statut           = "terminee",
            nb_jours_saisis  = len(request.entrees),
        )
        db.add(evaluation)
        db.flush()

        # ── 2 & 3. entrees_quotidiennes + textes_libres ──────────────────
        for jour_idx, (entree, nlp_jour) in enumerate(
            zip(request.entrees, scores_nlp_par_jour), start=1
        ):
            # Entrée comportementale
            entree_db = EntreeQuotidienne(
                id_evaluation      = evaluation.id_evaluation,
                jour_numero        = jour_idx,
                heures_sommeil     = entree.heures_sommeil,
                stress_level       = entree.stress_level,
                anxiety_level      = entree.anxiety_level,
                social_media_hours = entree.social_media_hours,
                physical_activity  = entree.physical_activity,
                family_history     = entree.family_history,
                coping_struggles   = entree.coping_struggles,
                mood_swings        = entree.mood_swings,
                days_indoors       = entree.days_indoors,
            )
            db.add(entree_db)
            db.flush()

            # Texte libre avec score NLP du JOUR (pas du global)
            if entree.texte_journal and entree.texte_journal.strip():
                texte_db = TexteLibre(
                    id_entree          = entree_db.id_entree,
                    id_evaluation      = evaluation.id_evaluation,
                    texte_brut         = entree.texte_journal,

                    # ✅ Score NLP individuel du jour
                    classe_predite_nlp = nlp_jour.get("classe_predite"),
                    score_nlp          = nlp_jour.get("score_nlp"),
                    probabilites_nlp   = nlp_jour.get("probabilites"),
                    signal_suicidaire  = nlp_jour.get("signal_suicidaire", False),
                )
                db.add(texte_db)

        # ── 4. predictions (résultat fusion globale 7 jours) ─────────────
        prediction_db = Prediction(
            id_evaluation        = evaluation.id_evaluation,
            score_comportemental = details.get("score_comportemental", 0.0),
            score_nlp            = details.get("score_nlp", 0.0),
            alpha_utilise        = details.get("alpha_utilise", 0.5),
            score_final          = result["score_final"],
            niveau_risque        = result["niveau_risque"],
            message_fr           = result["message_fr"],
            classe_nlp           = details.get("classe_nlp"),
            label_comportemental = details.get("label_comportemental"),
            signal_suicidaire    = result.get("signal_suicidaire", False),
            probabilites_nlp     = details.get("probabilites_nlp"),
        )
        db.add(prediction_db)

        # ── 5. audit_log ─────────────────────────────────────────────────
        audit = AuditLog(
            id_utilisateur    = user_id,
            action            = "prediction",
            adresse_ip        = adresse_ip,
            niveau_risque     = result["niveau_risque"],
            signal_suicidaire = result.get("signal_suicidaire", False),
            details           = {
                "score_final": result["score_final"],
                "nb_jours":    len(request.entrees),
                "classe_nlp":  details.get("classe_nlp"),
            },
        )
        db.add(audit)
        db.commit()
        logger.info(
            "Évaluation sauvegardée — user=%d | eval=%d | score=%.4f",
            user_id, evaluation.id_evaluation, result["score_final"]
        )

    except Exception as e:
        db.rollback()
        logger.error("Erreur sauvegarde BDD : %s", e)

@router.post("", response_model=PredictionResponse, status_code=200)
def predict(
    request_obj:      Request,
    payload:          PredictionRequest,
    background_tasks: BackgroundTasks,
    current_user:     Utilisateur = Depends(get_current_user),
    db:               Session     = Depends(get_db),
):
    daily_entries = [e.model_dump(exclude={"texte_journal"}) for e in payload.entrees]
    daily_texts_fr = [e.texte_journal or "" for e in payload.entrees]   # textes originaux

    if not any(t.strip() for t in daily_texts_fr):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Au moins un journal textuel est requis."
        )

    # ── Traduction des textes français → anglais ─────────────────────────
    daily_texts_en = []
    for texte in daily_texts_fr:
        if texte.strip():
            try:
                translated = translator.translate(texte)
                daily_texts_en.append(translated)
            except Exception as e:
                logger.error("Erreur traduction texte : %s", e)
                # Fallback : utiliser le texte original (non traduit)
                daily_texts_en.append(texte)
        else:
            daily_texts_en.append("")   # texte vide

    # ── Scores NLP jour par jour (sur textes traduits) ───────────────────
    scores_nlp_par_jour = []
    for texte_en in daily_texts_en:
        if texte_en.strip():
            try:
                scores_nlp_par_jour.append(predict_nlp(texte_en))
            except Exception:
                scores_nlp_par_jour.append({
                    "classe_predite":   "Normal",
                    "score_nlp":        0.0,
                    "probabilites":     {},
                    "signal_suicidaire": False,
                })
        else:
            scores_nlp_par_jour.append({
                "classe_predite":   None,
                "score_nlp":        None,
                "probabilites":     None,
                "signal_suicidaire": False,
            })

    # ── Pipeline ML global (fusion sur les 7 jours) avec textes traduits ──
    try:
        result = predict_global_from_raw(daily_entries, daily_texts_en)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"Modèle non disponible : {e}")
    except Exception as e:
        logger.error("Erreur pipeline ML : %s", e)
        raise HTTPException(status_code=500, detail="Erreur interne du pipeline.")

    # ── Sauvegarde en arrière-plan (textes originaux français) ───────────
    adresse_ip = request_obj.client.host if request_obj.client else None
    background_tasks.add_task(
        _save_full_evaluation,
        db, current_user.id_utilisateur,
        payload, result,
        scores_nlp_par_jour,
        adresse_ip,
    )

    if result.get("signal_suicidaire"):
        logger.warning(
            "SIGNAL SUICIDAIRE — user=%d | score=%.4f",
            current_user.id_utilisateur, result["score_final"]
        )

    return result