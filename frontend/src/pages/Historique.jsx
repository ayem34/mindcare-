import { useEffect, useState } from 'react';
import { getHistorique, getStats } from '../services/api';

const NIVEAU = {
  faible: { color: 'text-green-700',  bg: 'bg-green-50',  emoji: '🟢', label: 'Faible' },
  modere: { color: 'text-orange-700', bg: 'bg-orange-50', emoji: '🟡', label: 'Modéré' },
  eleve:  { color: 'text-red-700',    bg: 'bg-red-50',    emoji: '🔴', label: 'Élevé' },
};

const NLP_FR = {
  Normal: 'Normal', Depression: 'Dépression', Suicidal: 'Pensées suicidaires',
  Anxiety: 'Anxiété', Bipolar: 'Bipolaire', Stress: 'Stress',
  'Personality disorder': 'Personnalité',
};

export default function Historique() {
  const [data,    setData]    = useState({ total: 0, resultats: [] });
  const [stats,   setStats]   = useState(null);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const PAR_PAGE = 10;

  useEffect(() => {
    setLoading(true);
    Promise.all([getHistorique(page, PAR_PAGE), getStats()])
      .then(([h, s]) => { setData(h.data); setStats(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(data.total / PAR_PAGE);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Historique des évaluations</h1>

      {/* Stats résumé */}
      {stats && stats.total_predictions > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total',       value: stats.total_predictions,                        color: 'text-indigo-700' },
            { label: 'Score moyen', value: `${(stats.score_moyen*100).toFixed(0)}%`,        color: 'text-indigo-700' },
            { label: 'Meilleur',    value: `${(stats.score_min*100).toFixed(0)}%`,           color: 'text-green-700' },
            { label: 'Pire',        value: `${(stats.score_max*100).toFixed(0)}%`,           color: 'text-red-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : data.resultats.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-600 font-medium">Aucune évaluation enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date','Score final','Comportemental','NLP','Niveau de risque','Classe NLP','Alerte'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.resultats.map((r) => {
                  const c = NIVEAU[r.niveau_risque] || {};
                  return (
                    <tr key={r.id_evaluation} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {new Date(r.date_prediction).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-900">
                        {(r.score_final * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {(r.score_comportemental * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {(r.score_nlp * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
                          {c.emoji} {c.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {NLP_FR[r.classe_nlp] || r.classe_nlp || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.signal_suicidaire
                          ? <span className="text-red-600 font-bold text-xs">🚨 OUI</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {data.total} résultat{data.total > 1 ? 's' : ''} — page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  ← Précédent
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
