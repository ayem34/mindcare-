import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });
API.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const NIVEAU_COLOR = {
  faible: 'bg-green-100 text-green-700 border-green-300',
  modere: 'bg-orange-100 text-orange-700 border-orange-300',
  eleve:  'bg-red-100 text-red-700 border-red-300',
};

export default function Chat() {
  const { state }    = useLocation();
  const navigate     = useNavigate();
  const resultat     = state?.resultat;
  const id_eval      = state?.id_evaluation;

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [ouverture, setOuverture] = useState(false);
  const bottomRef = useRef(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ouvrir la conversation automatiquement
  useEffect(() => {
    if (!id_eval || ouverture) return;
    setOuverture(true);
    setLoading(true);
    API.post(`/chat/ouvrir?id_evaluation=${id_eval}`)
      .then(r => {
        setMessages([{ role: 'assistant', content: r.data.reponse }]);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: "Bonjour, je suis là pour t'accompagner. Comment tu te sens aujourd'hui ?"
        }]);
      })
      .finally(() => setLoading(false));
  }, [id_eval]);

  const envoyerMessage = async () => {
    if (!input.trim() || loading) return;

    const nouveauMessage = { role: 'user', content: input };
    const historique     = [...messages, nouveauMessage];
    setMessages(historique);
    setInput('');
    setLoading(true);

    try {
      const { data } = await API.post('/chat', {
        id_evaluation:       id_eval,
        historique:          messages,
        message_utilisateur: input,
      });
      setMessages([...historique, { role: 'assistant', content: data.reponse }]);
    } catch {
      setMessages([...historique, {
        role: 'assistant',
        content: "Je suis désolé, je n'ai pas pu répondre. Réessaie dans un instant."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      envoyerMessage();
    }
  };

  if (!id_eval) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Aucune évaluation liée à cette conversation.</p>
        <button onClick={() => navigate('/evaluation')}
          className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-indigo-700">
          Faire une évaluation
        </button>
      </div>
    );
  }

  const niveau = resultat?.niveau_risque || 'modere';
  const score  = resultat?.score_final;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-5rem)]">

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg">🧠</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Assistant MindCare</p>
              <p className="text-xs text-gray-400">Soutien émotionnel confidentiel</p>
            </div>
          </div>
          {niveau && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${NIVEAU_COLOR[niveau]}`}>
              Risque {niveau} {score ? `— ${(score*100).toFixed(0)}%` : ''}
            </span>
          )}
        </div>

        {/* Avertissement */}
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
          <p className="text-xs text-amber-700">
            Cet assistant ne remplace pas un professionnel de santé.
            En cas d'urgence, appelle le <strong>SAMU Social : 185</strong>.
          </p>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400 text-sm">Démarrage de la conversation...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-sm">🧠</span>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center mr-2 mt-1">
              <span className="text-sm">🧠</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris comment tu te sens..."
          rows={2}
          className="flex-1 resize-none text-sm focus:outline-none text-gray-800 placeholder-gray-400 leading-relaxed"
        />
        <button
          onClick={envoyerMessage}
          disabled={!input.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0">
          Envoyer
        </button>
      </div>

      {/* Ressources */}
      <div className="mt-3 flex gap-2 flex-wrap justify-center">
        {[
          { label: 'SAMU Social', val: '185' },
          { label: 'SOS Amitié', val: '09 72 39 40 50' },
        ].map(r => (
          <span key={r.val} className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
            {r.label} : <strong>{r.val}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}