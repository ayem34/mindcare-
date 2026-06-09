import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom ?? ''}`.trim()
    : user?.email?.split('@')[0]?.toUpperCase() ?? 'UTILISATEUR';

  function handleLogout() {
    logout();
    navigate('/login');
  }

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
    {
      label: 'Données anonymisées',
      sub: 'Aucune donnée nominative transmise',
      icon: (
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <rect x="2" y="5" width="11" height="9" rx="2" stroke="#27AE7A" strokeWidth="1.4"/>
          <path d="M5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="#27AE7A" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Outil d'aide, non de diagnostic",
      sub: 'À interpréter avec un professionnel',
      icon: (
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="5.5" stroke="#27AE7A" strokeWidth="1.4"/>
          <path d="M5 7.5l2 2 3-3" stroke="#27AE7A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: 'Conformité RGPD',
      sub: 'Données pseudonymisées, stockage EU',
      icon: (
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 2L12 4v4c0 2.8-2 4.8-4.5 5.5C5 12.8 3 10.8 3 8V4l4.5-2z" stroke="#27AE7A" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

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

        /* ── Shell */
        .db-shell {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* ── Nav */
        .db-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(245,248,247,0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 2.5rem;
          height: 62px;
        }

        .db-nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
          margin-right: 3rem;
        }
        .db-nav-logo-mark {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: var(--green-soft);
          border: 1px solid rgba(39,174,122,0.22);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .db-nav-logo-mark:hover { background: rgba(39,174,122,0.18); }
        .db-nav-logo-text {
          font-family: 'DM Serif Display', serif;
          font-size: 17px; color: var(--navy);
          letter-spacing: -0.02em;
        }
        .db-nav-logo-ia {
          font-size: 10px; font-weight: 700;
          color: var(--green);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-left: 2px;
        }

        .db-nav-links { display: flex; align-items: center; gap: 2px; flex: 1; }
        .db-nav-link {
          padding: 7px 15px;
          border-radius: 8px;
          font-size: 13.5px; font-weight: 500;
          color: var(--text-muted);
          cursor: pointer; border: none; background: none;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, color 0.15s;
        }
        .db-nav-link:hover { background: var(--green-soft); color: var(--navy); }
        .db-nav-link.active {
          background: var(--green-soft);
          color: var(--green-mid);
          font-weight: 600;
          border: 1px solid rgba(39,174,122,0.2);
        }

        .db-nav-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .db-nav-user { display: flex; align-items: center; gap: 9px; }
        .db-nav-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--green) 0%, var(--green-mid) 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 700; color: #fff;
          flex-shrink: 0;
          border: 2px solid rgba(39,174,122,0.25);
        }
        .db-nav-username { font-size: 13px; font-weight: 600; color: var(--navy); }
        .db-nav-sep { width: 1px; height: 20px; background: var(--border); }
        .db-nav-logout {
          font-size: 13px; font-weight: 600; color: #DC2626;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 6px 11px; border-radius: 7px;
          transition: background 0.15s, color 0.15s;
        }
        .db-nav-logout:hover { background: rgba(220,38,38,0.07); color: #B91C1C; }

        /* ── Main */
        .db-main {
          flex: 1;
          max-width: 1140px; width: 100%;
          margin: 0 auto;
          padding: 2.75rem 2.5rem 3.5rem;
        }

        /* ── Page header */
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

        /* CTA */
        .db-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--green); color: #fff;
          border: none; border-radius: 11px;
          padding: 12px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; flex-shrink: 0;
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

        /* ── Grid */
        .db-grid {
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 1.25rem;
          align-items: start;
        }

        /* ── Card */
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

        /* ── Empty state */
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

        /* ── Sidebar */
        .db-sidebar { display: flex; flex-direction: column; gap: 1.1rem; }

        /* Trouble list */
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

        /* Garanties */
        .db-trust-list { display: flex; flex-direction: column; gap: 7px; }
        .db-trust-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border-radius: 9px;
          background: var(--green-pale);
          border: 1px solid rgba(39,174,122,0.1);
        }
        .db-trust-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--green-soft);
          border: 1px solid rgba(39,174,122,0.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
        .db-trust-label { font-size: 12.5px; font-weight: 600; color: var(--navy); line-height: 1.35; }
        .db-trust-sub { font-size: 11.5px; font-weight: 400; color: var(--text-muted); margin-top: 1px; }

        /* Urgence */
        .db-urgency {
          background: #FEF2F2;
          border: 1px solid rgba(220,38,38,0.16);
          border-radius: 14px; padding: 1.1rem 1.3rem;
          display: flex; align-items: center; gap: 13px;
        }
        .db-urgency-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(220,38,38,0.09);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .db-urgency-title { font-size: 12px; font-weight: 700; color: #B91C1C; margin-bottom: 1px; }
        .db-urgency-num {
          font-family: 'DM Serif Display', serif;
          font-size: 22px; color: #B91C1C; letter-spacing: -0.03em; line-height: 1;
        }
        .db-urgency-sub { font-size: 11px; color: #E05252; margin-top: 2px; }

        /* ── Footer */
        .db-footer {
          border-top: 1px solid var(--border);
          padding: 1.1rem 2.5rem;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(245,248,247,0.85);
        }
        .db-footer-l { font-size: 11.5px; color: var(--text-light); }
        .db-footer-l strong { color: var(--text-muted); font-weight: 600; }
        .db-footer-r { font-size: 11px; color: var(--text-light); }

        /* ── Responsive */
        @media (max-width: 900px) {
          .db-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .db-main { padding: 1.5rem 1.25rem 2.5rem; }
          .db-nav  { padding: 0 1.25rem; }
          .db-page-header { flex-direction: column; }
          .db-nav-username { display: none; }
        }
      `}</style>

      <div className="db-shell">

        

        {/* ══ MAIN */}
        <main className="db-main">

          {/* Page header */}
          <div className="db-page-header">
            <div>
              <div className="db-eyebrow">
                <div className="db-eyebrow-dot" />
                Tableau de bord
              </div>
              <h1 className="db-h1">Bonjour, {displayName} </h1>
              <p className="db-sub">Voici votre bilan de santé mentale</p>
            </div>
            <button className="db-cta" onClick={() => navigate('/evaluation')}>
              <span className="db-cta-plus">+</span>
              Nouvelle évaluation
            </button>
          </div>

          {/* Main grid */}
          <div className="db-grid">

            {/* Left — évaluations */}
            <div className="db-card">
              <div className="db-card-head">
                <div className="db-card-title">Évaluations récentes</div>
                <span className="db-card-badge">7 troubles analysés</span>
              </div>
              <div className="db-empty">
                <div className="db-empty-ring">
                  <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                    <path d="M4 17h5l3.5-9 5 18 3.5-10.5 2.5 5H30"
                          stroke="#27AE7A" strokeWidth="2.1"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="db-empty-h">Aucune évaluation encore</h2>
                <p className="db-empty-p">
                  Commencez votre première évaluation pour obtenir
                  un bilan personnalisé de votre santé mentale.
                </p>
                <button className="db-empty-btn" onClick={() => navigate('/evaluation')}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Commencer maintenant
                </button>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="db-sidebar">

              {/* Troubles */}
              <div className="db-card">
                <div className="db-card-head">
                  <div className="db-card-title">Troubles analysés</div>
                </div>
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

              {/* Garanties */}
              <div className="db-card">
                <div className="db-card-head">
                  <div className="db-card-title">Garanties</div>
                </div>
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

              {/* Urgence */}
              <div className="db-urgency">
                <div className="db-urgency-icon">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3v7M10 14v.5"
                          stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="10" cy="10" r="8"
                            stroke="#B91C1C" strokeWidth="1.4"/>
                  </svg>
                </div>
                <div>
                  <div className="db-urgency-title">Urgence psychiatrique</div>
                  <div className="db-urgency-num">3114</div>
                  <div className="db-urgency-sub">Numéro national gratuit · 24h/24</div>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* ══ FOOTER */}
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
