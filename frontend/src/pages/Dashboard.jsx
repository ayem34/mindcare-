import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStats, getHistorique } from '../services/api';

const NIVEAU = {
  faible: { color: '#27AE7A', bg: '#E8F5F0', emoji: '🟢', label: 'Faible' },
  modere: { color: '#E67E22', bg: '#FEF5E8', emoji: '🟡', label: 'Modéré' },
  eleve:  { color: '#D04A4A', bg: '#FEF2F2', emoji: '🔴', label: 'Élevé' },
};

import { telechargerPDF } from '../components/RapportPDF';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [derniers, setDerniers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getHistorique(1, 5)])
      .then(([s, h]) => {
        setStats(s.data);
        setDerniers(h.data.resultats || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom ?? ''}`.trim()
    : user?.email?.split('@')[0]?.toUpperCase() ?? 'UTILISATEUR';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const troubles = [
    { name: 'Dépression',          color: '#4A6A8A' },
    { name: 'Anxiété généralisée', color: '#27AE7A' },
    { name: 'Trouble bipolaire',   color: '#7C6BBB' },
    { name: 'TDAH',                color: '#E08A27' },
    { name: 'Stress post-trauma',  color: '#D04A4A' },
    { name: 'Phobies sociales',    color: '#2A9AB8' },
    { name: 'TOC',                 color: '#8A6A4A' },
  ];

  const garanties = [
    { label: 'Données anonymisées', sub: 'Aucune donnée nominative transmise', icon: '🔒' },
    { label: "Outil d'aide, non de diagnostic", sub: 'À interpréter avec un professionnel', icon: '⚕️' },
    { label: 'Conformité RGPD', sub: 'Données pseudonymisées, stockage EU', icon: '🔐' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalEvals = stats?.total_predictions || 0;
  const scoreMoyen = stats?.score_moyen != null ? `${(stats.score_moyen * 100).toFixed(0)}%` : null;
  const scoreMin = stats?.score_min != null ? `${(stats.score_min * 100).toFixed(0)}%` : null;
  const scoreMax = stats?.score_max != null ? `${(stats.score_max * 100).toFixed(0)}%` : null;
  const dernierNiveau = stats?.dernier_niveau;
  const dernierScore = stats?.dernier_score != null ? (stats.dernier_score * 100).toFixed(0) : null;
  const conf = NIVEAU[dernierNiveau] || {};

  const pdfData = { displayName, totalEvals, scoreMoyen, scoreMin, scoreMax, dernierNiveau, dernierScore, derniers, conf };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy:       #0D2B4E;
          --navy-mid:   #1B4F8A;
          --green:      #27AE7A;
          --green-soft: #E8F5F0;
          --green-mid:  #1A7A56;
          --green-pale: #F0FAF6;
          --bg:         #F5F8F7;
          --card:       #FFFFFF;
          --border:     #DDE8E3;
          --text:       #0D2B4E;
          --text-muted: #5A7499;
          --text-light: #8BA3BF;
        }

        html, body, #root { height: 100%; }

        .db-shell {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .db-main {
          flex: 1;
          max-width: 1140px;
          width: 100%;
          margin: 0 auto;
          padding: 2.75rem 2.5rem 3.5rem;
        }

        .db-page-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2.25rem; gap: 1.5rem;
        }
        .db-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--green-mid);
          margin-bottom: 0.4rem;
        }
        .db-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          animation: pulse 2.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(39,174,122,0.55); }
          50%      { box-shadow: 0 0 0 5px rgba(39,174,122,0); }
        }
        .db-h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(26px, 3vw, 36px);
          color: var(--navy); letter-spacing: -0.03em; line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        .db-sub { font-size: 14.5px; color: var(--text-muted); line-height: 1.55; }

        .db-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .db-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--green); color: #fff;
          border: none; border-radius: 11px;
          padding: 12px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .db-cta:hover {
          background: var(--green-mid);
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(39,174,122,0.28);
        }
        .db-cta-plus {
          width: 24px; height: 24px; border-radius: 7px;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; line-height: 1;
        }

        .db-pdf-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #fff;
          color: var(--text-muted);
          border: 1.5px solid var(--border);
          border-radius: 11px;
          padding: 11px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .db-pdf-btn:hover {
          border-color: #D04A4A;
          color: #D04A4A;
          background: #FEF2F2;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(208,74,74,0.12);
        }
        .db-pdf-icon {
          font-size: 16px;
        }

        .db-grid {
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 1.25rem;
          align-items: start;
        }

        .db-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
        }
        .db-card-head {
          padding: 1.3rem 1.6rem;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
        }
        .db-card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 17.5px; color: var(--navy); letter-spacing: -0.02em;
        }
        .db-card-badge {
          font-size: 11px; font-weight: 600;
          color: var(--green-mid);
          background: var(--green-soft);
          border: 1px solid rgba(39,174,122,0.2);
          border-radius: 100px; padding: 3px 10px;
        }

        .db-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 4.5rem 2rem 4rem; text-align: center;
        }
        .db-empty-ring {
          width: 76px; height: 76px; border-radius: 50%;
          background: var(--green-pale);
          border: 1.5px dashed rgba(39,174,122,0.35);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.5rem;
          font-size: 32px;
        }
        .db-empty-h {
          font-family: 'DM Serif Display', serif;
          font-size: 20px; color: var(--navy); letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }
        .db-empty-p {
          font-size: 14px; color: var(--text-muted); line-height: 1.65;
          max-width: 290px; margin-bottom: 2rem;
        }
        .db-empty-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: var(--green); color: #fff;
          border: none; border-radius: 10px;
          padding: 13px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px; font-weight: 700; cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .db-empty-btn:hover {
          background: var(--green-mid);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(39,174,122,0.28);
        }

        .db-sidebar { display: flex; flex-direction: column; gap: 1.1rem; }

        .db-trouble-list { display: flex; flex-direction: column; gap: 5px; }
        .db-trouble-item {
          display: flex; align-items: center; gap: 11px;
          padding: 9px 11px; border-radius: 9px;
          background: var(--green-pale);
          border: 1px solid rgba(39,174,122,0.1);
          transition: background 0.15s;
        }
        .db-trouble-item:hover { background: var(--green-soft); }
        .db-trouble-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .db-trouble-name { font-size: 13px; font-weight: 500; color: var(--navy); flex: 1; }
        .db-trouble-tag {
          font-size: 10px; font-weight: 700;
          color: var(--green-mid);
          background: var(--green-soft);
          border: 1px solid rgba(39,174,122,0.2);
          border-radius: 100px; padding: 2px 8px;
          letter-spacing: 0.03em;
        }

        .db-trust-list { display: flex; flex-direction: column; gap: 7px; }
        .db-trust-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border-radius: 9px;
          background: var(--green-pale);
          border: 1px solid rgba(39,174,122,0.1);
        }
        .db-trust-icon { font-size: 20px; width: 28px; text-align: center; }
        .db-trust-label { font-size: 12.5px; font-weight: 600; color: var(--navy); line-height: 1.35; }
        .db-trust-sub { font-size: 11.5px; font-weight: 400; color: var(--text-muted); margin-top: 1px; }

        .db-urgency {
          background: #FEF2F2;
          border: 1px solid rgba(220,38,38,0.16);
          border-radius: 14px; padding: 1.1rem 1.3rem;
          display: flex; align-items: center; gap: 13px;
        }
        .db-urgency-icon { font-size: 28px; }
        .db-urgency-title { font-size: 12px; font-weight: 700; color: #B91C1C; margin-bottom: 1px; }
        .db-urgency-num {
          font-family: 'DM Serif Display', serif;
          font-size: 22px; color: #B91C1C; letter-spacing: -0.03em; line-height: 1;
        }
        .db-urgency-sub { font-size: 11px; color: #E05252; margin-top: 2px; }

        .db-footer {
          border-top: 1px solid var(--border);
          padding: 1.1rem 2.5rem;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(245,248,247,0.85);
        }
        .db-footer-l { font-size: 11.5px; color: var(--text-light); }
        .db-footer-l strong { color: var(--text-muted); font-weight: 600; }
        .db-footer-r { font-size: 11px; color: var(--text-light); }

        @media (max-width: 900px) {
          .db-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .db-main { padding: 1.5rem 1.25rem 2.5rem; }
          .db-page-header { flex-direction: column; }
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-item {
          background: var(--green-pale);
          border-radius: 14px;
          padding: 0.8rem 1rem;
          text-align: center;
        }
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--navy);
        }
        .text-green { color: #27AE7A !important; }
        .text-red { color: #D04A4A !important; }

        .last-eval-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 14px;
          margin-bottom: 1.5rem;
        }
        .last-eval-emoji { font-size: 2rem; }
        .last-eval-label { font-size: 11px; color: var(--text-muted); }
        .last-eval-risk { font-weight: bold; font-size: 1rem; }
        .last-eval-link { margin-left: auto; font-size: 13px; color: var(--green); text-decoration: none; }

        .table-wrapper { overflow-x: auto; }
        .db-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .db-table th, .db-table td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .score-cell { font-weight: bold; }
        .level-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 40px;
          font-size: 12px;
        }
        .chat-btn {
          background: none;
          border: 1px solid var(--green);
          border-radius: 40px;
          padding: 4px 12px;
          color: var(--green);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-btn:hover {
          background: var(--green);
          color: white;
        }

        .pdf-footer-strip {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          background: var(--green-pale);
        }
        .pdf-footer-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #fff;
          color: #D04A4A;
          border: 1.5px solid rgba(208,74,74,0.25);
          border-radius: 9px;
          padding: 7px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pdf-footer-btn:hover {
          background: #FEF2F2;
          border-color: #D04A4A;
          box-shadow: 0 3px 10px rgba(208,74,74,0.12);
        }
      `}</style>

      <div className="db-shell">
        <main className="db-main">
          <div className="db-page-header">
            <div>
              <div className="db-eyebrow">
                <div className="db-eyebrow-dot" />
                Tableau de bord
              </div>
              <h1 className="db-h1">Bonjour, {displayName}</h1>
              <p className="db-sub">Voici votre bilan de santé mentale</p>
            </div>
            <button className="db-cta" onClick={() => navigate('/evaluation')}>
              <span className="db-cta-plus">+</span>
              Nouvelle évaluation
            </button>
          </div>

          <div className="db-grid">
            {/* Colonne principale */}
            <div className="db-card">
              <div className="db-card-head">
                <div className="db-card-title">Vue d'ensemble</div>
                <span className="db-card-badge">7 troubles analysés</span>
              </div>
              <div style={{ padding: '1.2rem' }}>
                {totalEvals === 0 ? (
                  <div className="db-empty">
                    <div className="db-empty-ring">📊</div>
                    <h2 className="db-empty-h">Aucune évaluation encore</h2>
                    <p className="db-empty-p">
                      Commencez votre première évaluation pour obtenir un bilan personnalisé de votre santé mentale.
                    </p>
                    <button className="db-empty-btn" onClick={() => navigate('/evaluation')}>
                      ➕ Commencer maintenant
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="stats-row">
                      <div className="stat-item"><span className="stat-label">Évaluations</span><span className="stat-value">{totalEvals}</span></div>
                      <div className="stat-item"><span className="stat-label">Score moyen</span><span className="stat-value">{scoreMoyen || '—'}</span></div>
                      <div className="stat-item"><span className="stat-label">Meilleur</span><span className="stat-value text-green">{scoreMin || '—'}</span></div>
                      <div className="stat-item"><span className="stat-label">Pire</span><span className="stat-value text-red">{scoreMax || '—'}</span></div>
                    </div>

                    {dernierNiveau && (
                      <div className="last-eval-card" style={{ backgroundColor: conf.bg }}>
                        <span className="last-eval-emoji">{conf.emoji}</span>
                        <div>
                          <div className="last-eval-label">Dernière évaluation</div>
                          <div className="last-eval-risk">Risque {conf.label} — {dernierScore}%</div>
                        </div>
                        <Link to="/historique" className="last-eval-link">Voir l'historique →</Link>
                      </div>
                    )}

                    <div className="table-wrapper">
                      <table className="db-table">
                        <thead>
                          <tr>
                            <th>Date</th><th>Score</th><th>Niveau</th><th>Classe NLP</th><th>Alerte</th><th>Assistant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {derniers.map(r => {
                            const c = NIVEAU[r.niveau_risque] || {};
                            let dateStr = 'Date inconnue';
                            if (r.date_prediction) {
                              const d = new Date(r.date_prediction);
                              if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('fr-FR');
                            }
                            const evalId = r.id_evaluation || r.evaluation_id || r.id;
                            return (
                              <tr key={r.id}>
                                <td>{dateStr}</td>
                                <td className="score-cell">{(r.score_final * 100).toFixed(1)}%</td>
                                <td><span className="level-badge" style={{ backgroundColor: c.bg, color: c.color }}>{c.emoji} {c.label}</span></td>
                                <td>{r.classe_nlp || '—'}</td>
                                <td>{r.signal_suicidaire ? '🚨 OUI' : '—'}</td>
                                <td>
                                  <button
                                    onClick={() => {
                                      if (evalId) {
                                        navigate('/chat', {
                                          state: {
                                            id_evaluation: evalId,
                                            resultat: { niveau_risque: r.niveau_risque, score_final: r.score_final }
                                          }
                                        });
                                      } else {
                                        alert('Identifiant manquant');
                                      }
                                    }}
                                    className="chat-btn"
                                  >
                                    💬 Discuter
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Bande PDF en bas de la carte */}
              {totalEvals > 0 && (
                <div className="pdf-footer-strip">
                  <button className="pdf-footer-btn" onClick={() => telechargerPDF(pdfData)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    Télécharger ce rapport en PDF
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="db-sidebar">
              <div className="db-card">
                <div className="db-card-head"><div className="db-card-title">Troubles analysés</div></div>
                <div style={{ padding: '1.1rem' }}>
                  <div className="db-trouble-list">
                    {troubles.map(t => (
                      <div key={t.name} className="db-trouble-item">
                        <div className="db-trouble-dot" style={{ background: t.color }} />
                        <div className="db-trouble-name">{t.name}</div>
                        <span className="db-trouble-tag">Inclus</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="db-card">
                <div className="db-card-head"><div className="db-card-title">Garanties</div></div>
                <div style={{ padding: '1.1rem' }}>
                  <div className="db-trust-list">
                    {garanties.map(g => (
                      <div key={g.label} className="db-trust-item">
                        <div className="db-trust-icon">{g.icon}</div>
                        <div>
                          <div className="db-trust-label">{g.label}</div>
                          <div className="db-trust-sub">{g.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="db-urgency">
                <div className="db-urgency-icon">🚨</div>
                <div>
                  <div className="db-urgency-title">Urgence psychiatrique</div>
                  <div className="db-urgency-num">3114</div>
                  <div className="db-urgency-sub">Numéro national gratuit · 24h/24</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="db-footer">
          <div className="db-footer-l">
            <strong>Projet Tutoré S2</strong> · Master Data Science · INPHB-IDSI 2025/2026
          </div>
          <div className="db-footer-r">
            Ce service ne constitue pas un diagnostic médical professionnel.
          </div>
        </footer>
      </div>
    </>
  );
}
