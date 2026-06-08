import { useLocation, useNavigate, Link } from 'react-router-dom';

const NIVEAU = {
  faible: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300', emoji: '🟢', label: 'Risque Faible',  desc: 'Votre bilan ne montre pas de signaux préoccupants.' },
  modere: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', emoji: '🟡', label: 'Risque Modéré', desc: 'Quelques signaux méritent attention. Parlez-en à un proche.' },
  eleve:  { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',    emoji: '🔴', label: 'Risque Élevé',  desc: 'Consultez un professionnel de santé mentale.' },
};

const NLP_CLASSES_FR = {
  Normal:                 'Normal',
  Depression:             'Dépression',
  Suicidal:               'Pensées suicidaires',
  Anxiety:                'Anxiété',
  Bipolar:                'Trouble bipolaire',
  Stress:                 'Stress',
  'Personality disorder': 'Trouble de la personnalité',
};

export default function Resultat() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const resultat   = state?.resultat;

  if (!resultat) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Aucun résultat à afficher.</p>
        <Link to="/evaluation" className="mt-4 inline-block text-indigo-600 hover:underline">
          Lancer une évaluation
        </Link>
      </div>
    );
  }

  const conf    = NIVEAU[resultat.niveau_risque] || NIVEAU.modere;
  const details = resultat.details || {};
  const pct     = Math.round(resultat.score_final * 100);

  // Trier les probabilités NLP
  const probas = Object.entries(details.probabilites_nlp || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Résultat de votre analyse</h1>
        <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">← Tableau de bord</Link>
      </div>

      {/* Alerte suicidaire */}
      {resultat.signal_suicidaire && (
        <div className="bg-red-600 text-white rounded-2xl p-5 flex items-start gap-3 shadow-lg">
          <span className="text-3xl">🚨</span>
          <div>
            <p className="font-bold text-lg">Signal de détresse détecté</p>
            <p className="text-sm opacity-90 mt-1">
              Si vous traversez une crise, contactez le 3114 (Numéro National de Prévention du Suicide — France, 24h/24).
            </p>
          </div>
        </div>
      )}

      {/* Score principal */}
      <div className={`rounded-2xl border-2 ${conf.border} ${conf.bg} p-6`}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{conf.emoji}</span>
          <div className="flex-1">
            <p className={`text-2xl font-bold ${conf.color}`}>{conf.label}</p>
            <p className="text-gray-600 text-sm mt-1">{resultat.message_fr}</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black ${conf.color}`}>{pct}%</p>
            <p className="text-xs text-gray-500">Score de risque</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4 bg-white rounded-full h-3 border border-gray-200">
          <div
            className={`h-3 rounded-full transition-all ${
              resultat.niveau_risque === 'faible' ? 'bg-green-500' :
              resultat.niveau_risque === 'modere' ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Détails des 2 modèles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score comportemental</p>
          <p className="text-2xl font-bold text-indigo-700">
            {Math.round((details.score_comportemental || 0) * 100)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">XGBoost — données journalières</p>
          <p className="text-sm font-medium text-gray-700 mt-2">
            {details.label_comportemental || '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score NLP</p>
          <p className="text-2xl font-bold text-purple-700">
            {Math.round((details.score_nlp || 0) * 100)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">TF-IDF + Logistic Regression</p>
          <p className="text-sm font-medium text-gray-700 mt-2">
            {NLP_CLASSES_FR[details.classe_nlp] || details.classe_nlp || '—'}
          </p>
        </div>
      </div>

      {/* Probabilités NLP — Histogramme */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Distribution des troubles détectés (NLP)</h2>
        <div className="space-y-3">
          {probas.map(([cls, prob]) => {
            const pct2 = Math.round(prob * 100);
            const isTop = cls === details.classe_nlp;
            return (
              <div key={cls}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${isTop ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {isTop && '★ '}{NLP_CLASSES_FR[cls] || cls}
                  </span>
                  <span className={isTop ? 'font-bold text-indigo-700' : 'text-gray-500'}>{pct2}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${isTop ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    style={{ width: `${pct2}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Alpha utilisé : {details.alpha_utilise} (pondération comportemental / NLP)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end flex-wrap">
        <button onClick={() => navigate('/evaluation')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          Nouvelle évaluation
        </button>
        <Link to="/historique"
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors font-medium">
          Voir l'historique
        </Link>
      </div>
    </div>
  );
}
