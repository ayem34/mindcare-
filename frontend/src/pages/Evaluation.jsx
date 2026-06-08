import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { predict } from '../services/api';

const JOURS = ['Jour 1','Jour 2','Jour 3','Jour 4','Jour 5','Jour 6','Jour 7'];

const ENTREE_VIDE = {
  heures_sommeil: '', stress_level: '', anxiety_level: '',
  social_media_hours: '', physical_activity: '', family_history: '0',
  coping_struggles: '0', mood_swings: '', days_indoors: '',
  texte_journal: '',
};

const CHAMPS = [
  { key: 'heures_sommeil',     label: 'Heures de sommeil',      type: 'number', min: 0, max: 24,  step: 0.5, placeholder: 'ex: 7' },
  { key: 'stress_level',       label: 'Niveau de stress',       type: 'number', min: 0, max: 10,  step: 1,   placeholder: '0 à 10' },
  { key: 'anxiety_level',      label: "Niveau d'anxiété",       type: 'number', min: 0, max: 10,  step: 1,   placeholder: '0 à 10' },
  { key: 'mood_swings',        label: "Sautes d'humeur",        type: 'number', min: 0, max: 10,  step: 1,   placeholder: '0 à 10' },
  { key: 'social_media_hours', label: 'Réseaux sociaux (h)',    type: 'number', min: 0, max: 24,  step: 0.5, placeholder: 'ex: 3' },
  { key: 'physical_activity',  label: 'Activité physique (h)',  type: 'number', min: 0, max: 10,  step: 0.5, placeholder: 'ex: 1' },
  { key: 'days_indoors',       label: 'Jours sans sortir',      type: 'number', min: 0, max: 7,   step: 1,   placeholder: '0 à 7' },
];

const SELECT_CHAMPS = [
  { key: 'family_history',  label: 'Antécédents familiaux',   options: [['0','Non'],['1','Oui']] },
  { key: 'coping_struggles', label: 'Difficultés à gérer',   options: [['0','Non'],['1','Oui']] },
];

export default function Evaluation() {
  const navigate = useNavigate();
  const [jourActif, setJourActif] = useState(0);
  const [entrees,   setEntrees]   = useState(Array(7).fill(null).map(() => ({ ...ENTREE_VIDE })));
  const [loading,   setLoading]   = useState(false);
  const [erreur,    setErreur]    = useState('');

  const updateEntree = (idx, key, val) => {
    const copy = [...entrees];
    copy[idx] = { ...copy[idx], [key]: val };
    setEntrees(copy);
  };

  const jourComplet = (idx) => {
    const e = entrees[idx];
    return CHAMPS.every(c => e[c.key] !== '') && e.texte_journal.trim().length > 10;
  };

  const handleSubmit = async () => {
    const incomplets = entrees.map((_, i) => !jourComplet(i)).filter(Boolean);
    if (incomplets.length > 0) {
      setErreur('Remplissez tous les champs de chaque jour (journal : min 10 caractères).');
      return;
    }
    setErreur('');
    setLoading(true);
    try {
      const payload = {
        entrees: entrees.map(e => ({
          heures_sommeil:     parseFloat(e.heures_sommeil),
          stress_level:       parseFloat(e.stress_level),
          anxiety_level:      parseFloat(e.anxiety_level),
          social_media_hours: parseFloat(e.social_media_hours),
          physical_activity:  parseFloat(e.physical_activity),
          family_history:     parseFloat(e.family_history),
          coping_struggles:   parseFloat(e.coping_struggles),
          mood_swings:        parseFloat(e.mood_swings),
          days_indoors:       parseFloat(e.days_indoors),
          texte_journal:      e.texte_journal,
        }))
      };
      const { data } = await predict(payload);
      navigate('/resultat', { state: { resultat: data } });
    } catch (err) {
      setErreur(err.response?.data?.detail || 'Erreur lors de la prédiction.');
    } finally {
      setLoading(false);
    }
  };

  const e = entrees[jourActif];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Évaluation sur 7 jours</h1>
        <p className="text-gray-500 text-sm mt-1">Remplissez chaque jour puis soumettez pour obtenir votre analyse.</p>
      </div>

      {/* Onglets jours */}
      <div className="flex gap-2 flex-wrap mb-6">
        {JOURS.map((j, i) => (
          <button key={i} onClick={() => setJourActif(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              jourActif === i
                ? 'bg-indigo-600 text-white shadow'
                : jourComplet(i)
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}>
            {jourComplet(i) ? '✓ ' : ''}{j}
          </button>
        ))}
      </div>

      {/* Formulaire du jour actif */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="font-semibold text-gray-800 text-lg">{JOURS[jourActif]}</h2>

        {/* Champs numériques */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CHAMPS.map(({ key, label, type, min, max, step, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type} min={min} max={max} step={step}
                placeholder={placeholder}
                value={e[key]}
                onChange={(ev) => updateEntree(jourActif, key, ev.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
          {SELECT_CHAMPS.map(({ key, label, options }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <select value={e[key]} onChange={(ev) => updateEntree(jourActif, key, ev.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Journal textuel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Journal du jour <span className="text-gray-400 font-normal">(décrivez comment vous vous sentez)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Exemple : Aujourd'hui je me suis senti épuisé sans raison..."
            value={e.texte_journal}
            onChange={(ev) => updateEntree(jourActif, 'texte_journal', ev.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          <p className="text-xs text-gray-400 mt-1">{e.texte_journal.length} caractères (min. 10)</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          <button onClick={() => setJourActif(Math.max(0, jourActif - 1))}
            disabled={jourActif === 0}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
            ← Précédent
          </button>
          {jourActif < 6
            ? <button onClick={() => setJourActif(jourActif + 1)}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Suivant →
              </button>
            : null}
        </div>
      </div>

      {/* Progression */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${(entrees.filter((_, i) => jourComplet(i)).length / 7) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-600">
          {entrees.filter((_, i) => jourComplet(i)).length}/7 jours complétés
        </span>
      </div>

      {erreur && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{erreur}</div>
      )}

      {/* Bouton soumettre */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors shadow-sm">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Analyse en cours…
            </span>
          ) : 'Lancer l\'analyse IA'}
        </button>
      </div>
    </div>
  );
}
