import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStats, getHistorique } from '../services/api';

const NIVEAU = {
  faible: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', emoji: '🟢', label: 'Faible' },
  modere: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', emoji: '🟡', label: 'Modéré' },
  eleve:  { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    emoji: '🔴', label: 'Élevé' },
};

function Stat({ titre, valeur, sous, color = 'text-indigo-700' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{titre}</p>
      <p className={`text-2xl font-bold ${color}`}>{valeur ?? '—'}</p>
      {sous && <p className="text-xs text-gray-400 mt-1">{sous}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [derniers, setDerniers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getHistorique(1, 5)])
      .then(([s, h]) => { setStats(s.data); setDerniers(h.data.resultats || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  const conf = NIVEAU[stats?.dernier_niveau];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.prenom} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Voici votre bilan de santé mentale</p>
        </div>
        <Link to="/evaluation"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow">
          + Nouvelle évaluation
        </Link>
      </div>

      {stats?.total_predictions === 0 ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-10 text-center">
          <p className="text-5xl mb-3">🧠</p>
          <p className="text-indigo-800 font-semibold text-lg">Aucune évaluation encore</p>
          <p className="text-indigo-600 text-sm mt-1 mb-5">Commencez votre première évaluation sur 7 jours</p>
          <Link to="/evaluation"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            Commencer maintenant
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat titre="Évaluations"  valeur={stats?.total_predictions} />
            <Stat titre="Score moyen"  valeur={stats?.score_moyen != null ? `${(stats.score_moyen*100).toFixed(0)}%` : null} />
            <Stat titre="Score min"    valeur={stats?.score_min != null ? `${(stats.score_min*100).toFixed(0)}%` : null} color="text-green-700" sous="Meilleur résultat" />
            <Stat titre="Score max"    valeur={stats?.score_max != null ? `${(stats.score_max*100).toFixed(0)}%` : null} color="text-red-700"   sous="Pire résultat" />
          </div>

          {conf && (
            <div className={`rounded-2xl border ${conf.border} ${conf.bg} p-5 flex items-center gap-4`}>
              <span className="text-4xl">{conf.emoji}</span>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Dernière évaluation</p>
                <p className={`text-xl font-bold ${conf.color}`}>
                  Risque {conf.label} — {(stats.dernier_score * 100).toFixed(0)}%
                </p>
              </div>
              <Link to="/historique" className="ml-auto text-sm text-indigo-600 hover:underline">Voir l'historique →</Link>
            </div>
          )}
        </>
      )}

      {derniers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Dernières évaluations</h2>
            <Link to="/historique" className="text-indigo-600 text-sm hover:underline">Voir tout →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date','Score','Niveau de risque','Classe NLP','Alerte suicidaire'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {derniers.map((r) => {
                  const c = NIVEAU[r.niveau_risque] || {};
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-600">{new Date(r.date_prediction).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-3 font-bold text-gray-900">{(r.score_final*100).toFixed(1)}%</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
                          {c.emoji} {c.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{r.classe_nlp || '—'}</td>
                      <td className="px-6 py-3">
                        {r.signal_suicidaire
                          ? <span className="text-red-600 font-bold text-xs">🚨 OUI</span>
                          : <span className="text-gray-400 text-xs">Non</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
