import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = axios.create({ baseURL: 'http://localhost:8000' });
API.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const NIVEAU_COLOR = {
  faible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  modere: 'bg-amber-50 text-amber-700 border-amber-200',
  eleve:  'bg-rose-50 text-rose-700 border-rose-200',
};

// Mots sensibles (détection locale)
const MOTS_SENSIBLES = ['suicide', 'mourir', 'envie d\'en finir', 'plus rien', 'me tuer', 'mettre fin'];

export default function Chat() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const resultat = state?.resultat;
  const id_eval  = state?.id_evaluation;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ouverture, setOuverture] = useState(false);
  const bottomRef = useRef(null);

  // Suggestions professionnelles
  const suggestions = [
    "Difficultés d'endormissement",
    "Stress professionnel",
    "Sentiment d'isolement",
    "Pensées négatives persistantes",
    "Anxiété généralisée",
    "Fatigue chronique"
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (id_eval) {
      const saved = localStorage.getItem(`chat_${id_eval}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) setMessages(parsed);
        } catch(e) {}
      }
    }
  }, [id_eval]);

  useEffect(() => {
    if (id_eval && messages.length > 0) {
      localStorage.setItem(`chat_${id_eval}`, JSON.stringify(messages));
    }
  }, [messages, id_eval]);

  useEffect(() => {
    if (!id_eval || ouverture || messages.length > 0) return;
    setOuverture(true);
    setLoading(true);
    API.post(`/chat/ouvrir?id_evaluation=${id_eval}`)
      .then(r => {
        setMessages([{ role: 'assistant', content: r.data.reponse }]);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: "Bonjour, je suis l'assistant MindCare. Comment puis-je vous aider aujourd'hui ?"
        }]);
      })
      .finally(() => setLoading(false));
  }, [id_eval, ouverture, messages.length]);

  const envoyerMessage = async (texte = input) => {
    if (!texte.trim() || loading) return;

    const texteLower = texte.toLowerCase();
    if (MOTS_SENSIBLES.some(mot => texteLower.includes(mot))) {
      const reponseUrgence = {
        role: 'assistant',
        content: "🆘 Ce que vous traversez est très sérieux. Je vous encourage vivement à contacter immédiatement le **185** (SAMU Social) – un professionnel est là pour vous écouter 24h/24. Vous n'êtes pas seul(e)."
      };
      setMessages(prev => [...prev, { role: 'user', content: texte }, reponseUrgence]);
      setInput('');
      return;
    }

    const nouveauMessage = { role: 'user', content: texte };
    const historique = [...messages, nouveauMessage];
    setMessages(historique);
    setInput('');
    setLoading(true);

    try {
      const { data } = await API.post('/chat', {
        id_evaluation:       id_eval,
        historique:          messages,
        message_utilisateur: texte,
      });
      setMessages([...historique, { role: 'assistant', content: data.reponse }]);
    } catch {
      setMessages([...historique, {
        role: 'assistant',
        content: "Désolé, une erreur technique s'est produite. Veuillez réessayer dans quelques instants."
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

  const handleSuggestion = (suggestion) => {
    envoyerMessage(suggestion);
  };

  const clearHistory = () => {
    if (window.confirm('Effacer toute la conversation ? Cette action est irréversible.')) {
      localStorage.removeItem(`chat_${id_eval}`);
      setMessages([]);
      setOuverture(false);
    }
  };

  if (!id_eval) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Aucune évaluation associée à cette conversation.</p>
        <button onClick={() => navigate('/evaluation')}
          className="mt-4 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-emerald-700 transition">
          Commencer une évaluation
        </button>
      </div>
    );
  }

  const niveau = resultat?.niveau_risque || 'modere';
  const score  = resultat?.score_final;
  const niveauTexte = niveau === 'modere' ? 'modéré' : niveau;

  const niveauInfo = {
    faible: "✅ État de bien-être général. Poursuivez vos activités et restez attentif à votre santé mentale.",
    modere: "🟡 Présence de signes à surveiller. Un accompagnement professionnel peut être bénéfique.",
    eleve:  "🔴 Niveau de détresse significatif. Une consultation rapide est recommandée. Numéro d'urgence : 185."
  }[niveau] || "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* En-tête professionnel */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100 p-5 mb-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M4 12H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">MindCare IA</h1>
              <p className="text-xs text-slate-400">Assistant en santé mentale</p>
            </div>
          </div>
          {niveau && (
            <div className={`text-xs font-medium px-3 py-1.5 rounded-full border ${NIVEAU_COLOR[niveau]}`}>
              ⚡ Risque {niveauTexte} {score ? `• ${(score*100).toFixed(0)}%` : ''}
            </div>
          )}
          <button
            onClick={clearHistory}
            className="text-slate-400 hover:text-slate-500 transition p-1"
            aria-label="Nouvelle conversation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 flex items-center gap-2">
              <span className="font-bold">📢 Information importante</span>
              Cet outil ne remplace pas un avis médical. En cas d'urgence, contactez le <strong className="text-amber-900">185</strong> (gratuit, 24h/24).
            </p>
          </div>
          {niveauInfo && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-800">{niveauInfo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-5 pr-2">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">Démarrage de la conversation...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">🧠</span>
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-white font-medium">{user?.prenom?.[0] || 'U'}</span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-start gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-sm">🧠</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            className="text-xs bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 rounded-full px-3 py-1.5 transition shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Zone de saisie */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          rows={1}
          className="flex-1 resize-none text-sm focus:outline-none text-slate-700 placeholder-slate-400 px-2 py-2"
        />
        <button
          onClick={() => envoyerMessage()}
          disabled={!input.trim() || loading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
        >
          Envoyer
        </button>
      </div>

      {/* Liens d'urgence */}
      <div className="mt-4 flex gap-3 justify-center text-xs text-slate-400">
        <span className="flex items-center gap-1">📞 <strong className="text-slate-500">185</strong> – SAMU Social</span>
        <span className="flex items-center gap-1">💬 <strong className="text-slate-500">09 72 39 40 50</strong> – SOS Amitié</span>
      </div>
    </div>
  );
}