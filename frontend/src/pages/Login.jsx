import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BG_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='960' height='1080' viewBox='0 0 960 1080'>
  <defs>
    <radialGradient id='g1' cx='70%' cy='20%' r='55%'>
      <stop offset='0%' stop-color='%2393C5D9' stop-opacity='0.22'/>
      <stop offset='100%' stop-color='transparent'/>
    </radialGradient>
    <radialGradient id='g2' cx='20%' cy='80%' r='50%'>
      <stop offset='0%' stop-color='%2327AE7A' stop-opacity='0.13'/>
      <stop offset='100%' stop-color='transparent'/>
    </radialGradient>
    <radialGradient id='g3' cx='85%' cy='75%' r='40%'>
      <stop offset='0%' stop-color='%234A8FBF' stop-opacity='0.15'/>
      <stop offset='100%' stop-color='transparent'/>
    </radialGradient>
  </defs>
  <rect width='960' height='1080' fill='%23EAF3F8'/>
  <rect width='960' height='1080' fill='url(%23g1)'/>
  <rect width='960' height='1080' fill='url(%23g2)'/>
  <rect width='960' height='1080' fill='url(%23g3)'/>
  <g stroke='%234A7A9B' stroke-opacity='0.06' stroke-width='0.7'>
    <line x1='0' y1='120' x2='960' y2='120'/><line x1='0' y1='240' x2='960' y2='240'/>
    <line x1='0' y1='360' x2='960' y2='360'/><line x1='0' y1='480' x2='960' y2='480'/>
    <line x1='0' y1='600' x2='960' y2='600'/><line x1='0' y1='720' x2='960' y2='720'/>
    <line x1='0' y1='840' x2='960' y2='840'/><line x1='0' y1='960' x2='960' y2='960'/>
    <line x1='120' y1='0' x2='120' y2='1080'/><line x1='240' y1='0' x2='240' y2='1080'/>
    <line x1='360' y1='0' x2='360' y2='1080'/><line x1='480' y1='0' x2='480' y2='1080'/>
    <line x1='600' y1='0' x2='600' y2='1080'/><line x1='720' y1='0' x2='720' y2='1080'/>
    <line x1='840' y1='0' x2='840' y2='1080'/>
  </g>
  <path d='M0 620 C160 560 320 680 480 620 S800 560 960 620 L960 1080 L0 1080 Z' fill='%234A8FBF' fill-opacity='0.06'/>
  <path d='M0 700 C200 650 380 760 560 700 S820 640 960 700 L960 1080 L0 1080 Z' fill='%2327AE7A' fill-opacity='0.05'/>
  <path d='M0 800 C240 760 440 840 640 800 S860 760 960 800 L960 1080 L0 1080 Z' fill='%234A7A9B' fill-opacity='0.07'/>
  <circle cx='820' cy='130' r='90' fill='none' stroke='%2393C5D9' stroke-opacity='0.18' stroke-width='1'/>
  <circle cx='820' cy='130' r='60' fill='none' stroke='%2393C5D9' stroke-opacity='0.12' stroke-width='0.8'/>
  <circle cx='820' cy='130' r='30' fill='%2393C5D9' fill-opacity='0.07'/>
  <circle cx='100' cy='300' r='70' fill='none' stroke='%2327AE7A' stroke-opacity='0.12' stroke-width='0.8'/>
  <circle cx='500' cy='900' r='110' fill='none' stroke='%234A8FBF' stroke-opacity='0.1' stroke-width='0.8'/>
  <polyline points='640,200 660,200 670,175 680,225 695,185 710,210 730,200 760,200'
            fill='none' stroke='%2327AE7A' stroke-opacity='0.22' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/>
  <circle cx='200' cy='160' r='3' fill='%234A8FBF' fill-opacity='0.18'/>
  <circle cx='740' cy='420' r='4' fill='%2327AE7A' fill-opacity='0.14'/>
  <circle cx='350' cy='760' r='3' fill='%2393C5D9' fill-opacity='0.2'/>
</svg>
`.trim();

const BG_URL = `url("data:image/svg+xml,${BG_SVG.replace(/\n\s*/g, ' ').replace(/"/g, "'")}")`;

export default function Login() {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'

  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [nom, setNom]           = useState('');
  const [prenom, setPrenom]     = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass]   = useState('');
  const [regPass2, setRegPass2] = useState('');

  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [consentResearch, setConsentResearch] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); 
    if (regPass !== regPass2) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (regPass.length < 6)   { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    try {
      await register(nom, prenom, regEmail, regPass);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erreur lors de la création du compte.');
    } finally { setLoading(false); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #0D2B4E; --navy-mid: #1B4F8A; --blue-soft: #4A6A8A;
          --blue-pastel: #EAF3F8; --green: #27AE7A; --green-soft: #E6F5EF;
          --green-mid: #1A7A56; --bg: #F7F9FC; --border: #D9E2EF;
          --text: #0D2B4E; --text-muted: #5A7499; --text-light: #8BA3BF;
          --rp-text: #0D2B4E; --rp-muted: #4A6A8A; --rp-light: #7A9AB8;
          --rp-border: rgba(74,106,138,0.2);
          --rp-input-bg: rgba(255,255,255,0.7);
          --rp-input-bdr: rgba(74,106,138,0.25);
        }
        html, body, #root { height: 100%; }

        .mc-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 500px; font-family: 'DM Sans', system-ui, sans-serif; }

        /* LEFT */
        .mc-left { background: var(--bg); display: flex; flex-direction: column; justify-content: space-between; padding: 3rem 3.5rem; border-right: 1px solid var(--border); overflow: hidden; position: relative; }
        .mc-left::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 48px 48px; opacity: 0.35; pointer-events: none; }
        .mc-left::after { content: ''; position: absolute; width: 520px; height: 520px; background: radial-gradient(circle, rgba(27,79,138,0.09) 0%, transparent 70%); top: -160px; left: -100px; pointer-events: none; }

        .mc-logo { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; }
        .mc-logo-mark { width: 36px; height: 36px; border-radius: 10px; background: var(--navy); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-logo-text { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--navy); letter-spacing: -0.02em; }
        .mc-logo-sub { font-size: 10px; font-weight: 500; color: var(--text-light); letter-spacing: 0.06em; text-transform: uppercase; display: block; line-height: 1; margin-top: 1px; }

        .mc-hero { position: relative; z-index: 2; }
        .mc-h1 { font-family: 'DM Serif Display', serif; font-size: clamp(40px,4.2vw,58px); color: var(--navy); line-height: 1.05; letter-spacing: -0.025em; margin-bottom: 1.5rem; }
        .mc-h1 em { font-style: italic; color: var(--navy-mid); }
        .mc-h1 mark { background: none; color: var(--green); }
        .mc-lead { font-size: 16px; color: var(--text-muted); line-height: 1.75; max-width: 430px; margin-bottom: 2.5rem; }

        .mc-metrics { display: grid; grid-template-columns: repeat(4,1fr); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; margin-bottom: 2.5rem; }
        .mc-metric { padding: 1.1rem 1rem; border-right: 1px solid var(--border); text-align: center; }
        .mc-metric:last-child { border-right: none; }
        .mc-metric-n { font-family: 'DM Serif Display', serif; font-size: 26px; color: var(--navy); letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px; }
        .mc-metric-l { font-size: 11px; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.05em; }

        .mc-donation-card { position: relative; z-index: 2; background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 1.5rem; margin-bottom: 2.5rem; }
        .mc-donation-icon { width: 38px; height: 38px; background: var(--green-soft); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-donation-title { font-family: 'DM Serif Display', serif; font-size: 17px; color: var(--navy); letter-spacing: -0.02em; margin-bottom: 2px; }
        .mc-donation-body { font-size: 13.5px; color: var(--text-muted); line-height: 1.65; margin-bottom: 1.1rem; }
        .mc-consent-row { display: flex; align-items: center; gap: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 9px; padding: 11px 14px; cursor: pointer; transition: border-color 0.18s, background 0.18s; }
        .mc-consent-row:hover, .mc-consent-row.active { border-color: var(--green); background: var(--green-soft); }
        .mc-toggle { width: 36px; height: 20px; border-radius: 10px; background: var(--border); position: relative; flex-shrink: 0; transition: background 0.22s; }
        .mc-toggle.on { background: var(--green); }
        .mc-toggle::after { content: ''; position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform 0.22s; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
        .mc-toggle.on::after { transform: translateX(16px); }
        .mc-consent-label { font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.45; user-select: none; }
        .mc-consent-label span { display: block; font-size: 11.5px; font-weight: 400; color: var(--text-light); margin-top: 1px; }

        .mc-footer-note { position: relative; z-index: 2; font-size: 11.5px; color: var(--text-light); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 1.25rem; }

        /* RIGHT */
        .mc-right { position: relative; display: flex; flex-direction: column; justify-content: center; padding: 3.5rem 3rem; overflow: hidden; }
        .mc-right-bg { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 0; }
        .mc-right-overlay { position: absolute; inset: 0; background: linear-gradient(145deg, rgba(234,243,248,0.90) 0%, rgba(214,232,244,0.88) 40%, rgba(198,224,238,0.85) 100%); backdrop-filter: blur(2px); z-index: 1; }
        .mc-rcontent { position: relative; z-index: 2; }

        /* Tabs */
        .mc-tabs { display: flex; background: rgba(255,255,255,0.55); border: 1px solid var(--rp-border); border-radius: 11px; padding: 4px; margin-bottom: 1.75rem; gap: 4px; }
        .mc-tab { flex: 1; padding: 10px; border-radius: 8px; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600; color: var(--rp-light); cursor: pointer; transition: background 0.18s, color 0.18s; }
        .mc-tab.active { background: #fff; color: var(--navy); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        .mc-r-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: var(--blue-soft); letter-spacing: 0.09em; text-transform: uppercase; margin-bottom: 1.1rem; }
        .mc-r-eyebrow-line { width: 24px; height: 1px; background: var(--blue-soft); opacity: 0.6; }
        .mc-r-title { font-family: 'DM Serif Display', serif; font-size: 30px; color: var(--navy); letter-spacing: -0.03em; line-height: 1.08; margin-bottom: 0.4rem; }
        .mc-r-title em { font-style: italic; color: var(--blue-soft); }
        .mc-r-sub { font-size: 14px; color: var(--rp-muted); line-height: 1.65; margin-bottom: 1.75rem; }

        .mc-form { display: flex; flex-direction: column; gap: 1rem; }
        .mc-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mc-field { display: flex; flex-direction: column; gap: 6px; }
        .mc-label { font-size: 11.5px; font-weight: 700; color: var(--rp-muted); letter-spacing: 0.06em; text-transform: uppercase; }
        .mc-input { background: var(--rp-input-bg); border: 1px solid var(--rp-input-bdr); border-radius: 10px; padding: 13px 16px; font-size: 15px; font-family: 'DM Sans', sans-serif; color: var(--rp-text); outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 100%; }
        .mc-input::placeholder { color: var(--rp-light); }
        .mc-input:focus { border-color: var(--green); background: rgba(255,255,255,0.92); box-shadow: 0 0 0 3px rgba(39,174,122,0.15); }

        .mc-forgot { font-size: 12.5px; font-weight: 500; color: var(--rp-light); text-decoration: none; align-self: flex-end; transition: color 0.18s; cursor: pointer; }
        .mc-forgot:hover { color: var(--blue-soft); }

        .mc-error { background: rgba(220,38,38,0.07); border: 1px solid rgba(220,38,38,0.22); border-radius: 9px; padding: 11px 14px; font-size: 13.5px; font-weight: 500; color: #B91C1C; display: flex; align-items: center; gap: 8px; }

        .mc-submit { background: var(--green); color: #fff; border: none; border-radius: 10px; padding: 16px 20px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 0.3rem; }
        .mc-submit:hover:not(:disabled) { background: #22996b; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(39,174,122,0.3); }
        .mc-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .mc-spinner { width: 17px; height: 17px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: mc-spin 0.7s linear infinite; flex-shrink: 0; }
        @keyframes mc-spin { to { transform: rotate(360deg); } }

        .mc-sep { display: flex; align-items: center; gap: 10px; margin: 1.4rem 0; }
        .mc-sep-line { flex: 1; height: 1px; background: var(--rp-border); }
        .mc-sep-txt { font-size: 10.5px; font-weight: 600; color: var(--rp-light); letter-spacing: 0.07em; text-transform: uppercase; }

        .mc-badges { display: flex; flex-direction: column; gap: 7px; }
        .mc-badge { display: flex; align-items: center; gap: 11px; background: rgba(255,255,255,0.6); border: 1px solid rgba(74,106,138,0.18); border-radius: 9px; padding: 10px 14px; backdrop-filter: blur(4px); }
        .mc-badge-icon { width: 30px; height: 30px; border-radius: 7px; background: var(--green-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-badge-copy { font-size: 13px; font-weight: 600; color: var(--navy); line-height: 1.35; }
        .mc-badge-copy span { display: block; font-size: 11.5px; font-weight: 400; color: var(--rp-muted); margin-top: 1px; }

        @media (max-width: 880px) {
          .mc-root { grid-template-columns: 1fr; }
          .mc-left { display: none; }
          .mc-right { min-height: 100vh; padding: 2.5rem 1.75rem; }
        }
      `}</style>

      <div className="mc-root">

        {/* ══ LEFT */}
        <div className="mc-left">
          <div className="mc-logo">
            <div className="mc-logo-mark">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10h3l2-5 3 10 2-6 1.5 3H18" stroke="#27AE7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="mc-logo-text">MindCare</div>
              <span className="mc-logo-sub">INPHB · IDSI</span>
            </div>
          </div>

          <div className="mc-hero">
            <h1 className="mc-h1">Détecter tôt,<br /><em>accompagner</em><br /><mark>mieux.</mark></h1>
            <p className="mc-lead">Un outil clinique d'aide à la détection précoce des troubles mentaux, conçu pour les professionnels et étudiants en santé. Résultats analytiques en moins de 2 secondes, traçabilité complète.</p>

            <div className="mc-metrics">
              {[['7','Troubles'],['7 j','Suivi'],['<2 s','Résultat'],['100%','Anonyme']].map(([n,l]) => (
                <div className="mc-metric" key={l}>
                  <div className="mc-metric-n">{n}</div>
                  <div className="mc-metric-l">{l}</div>
                </div>
              ))}
            </div>

            <div className="mc-donation-card">
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'0.75rem'}}>
                <div className="mc-donation-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2a4 4 0 0 1 4 4c0 3-4 9-4 9S5 9 5 6a4 4 0 0 1 4-4z" stroke="#27AE7A" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="9" cy="6.5" r="1.5" fill="#27AE7A"/>
                  </svg>
                </div>
                <div className="mc-donation-title">Contribuer à la recherche</div>
              </div>
              <p className="mc-donation-body">Vos données anonymisées peuvent enrichir les travaux du laboratoire IDSI sur la détection précoce. Votre participation est libre et révocable à tout moment.</p>
              <div
                className={`mc-consent-row${consentResearch ? ' active' : ''}`}
                onClick={() => setConsentResearch(v => !v)}
                role="checkbox" aria-checked={consentResearch} tabIndex={0}
                onKeyDown={e => (e.key===' '||e.key==='Enter') && setConsentResearch(v=>!v)}
              >
                <div className={`mc-toggle${consentResearch ? ' on' : ''}`} />
                <div className="mc-consent-label">
                  J'accepte le partage de mes données à des fins de recherche
                  <span>Conformité RGPD — données pseudonymisées, stockage EU</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mc-footer-note">
            Projet Tutoré S2 · Master Data Science · INPHB-IDSI 2025/2026.
            Ce service ne remplace pas un avis médical. Urgence psychiatrique : <strong style={{color:'var(--navy-mid)',fontWeight:600}}>3114</strong>.
          </div>
        </div>

        {/* ══ RIGHT */}
        <div className="mc-right">
          <div className="mc-right-bg" style={{ backgroundImage: BG_URL }} />
          <div className="mc-right-overlay" />

          <div className="mc-rcontent">
            <div className="mc-r-eyebrow">
              <div className="mc-r-eyebrow-line" />
              Accès sécurisé
            </div>

            {/* Onglets */}
            <div className="mc-tabs">
              <button className={`mc-tab${tab==='login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
                Se connecter
              </button>
              <button className={`mc-tab${tab==='register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
                Créer un compte
              </button>
            </div>

            {tab === 'login' ? (
              <>
                <h2 className="mc-r-title">Connexion à<br />votre <em>espace.</em></h2>
                <p className="mc-r-sub">Entrez vos identifiants pour accéder à votre tableau de bord.</p>

                <form className="mc-form" onSubmit={handleLogin}>
                  <div className="mc-field">
                    <label className="mc-label" htmlFor="email">Adresse e-mail</label>
                    <input id="email" type="email" className="mc-input" placeholder="vous@exemple.com"
                      value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
                  </div>
                  <div className="mc-field">
                    <label className="mc-label" htmlFor="password">Mot de passe</label>
                    <input id="password" type="password" className="mc-input" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/>
                  </div>
                  <a href="#" className="mc-forgot">Mot de passe oublié ?</a>
                  {error && (
                    <div className="mc-error">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <circle cx="7.5" cy="7.5" r="6.5" stroke="#B91C1C" strokeWidth="1.3"/>
                        <path d="M7.5 4.5v3.5M7.5 10.5v.5" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  <button type="submit" className="mc-submit" disabled={loading}>
                    {loading ? <><div className="mc-spinner"/> Vérification…</> : <>Se connecter <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="mc-r-title">Créer votre<br /><em>compte.</em></h2>
                <p className="mc-r-sub">Remplissez le formulaire pour commencer votre suivi personnalisé.</p>

                <form className="mc-form" onSubmit={handleRegister}>
                  <div className="mc-row2">
                    <div className="mc-field">
                      <label className="mc-label" htmlFor="prenom">Prénom</label>
                      <input id="prenom" type="text" className="mc-input" placeholder="Marc"
                        value={prenom} onChange={e => setPrenom(e.target.value)} required autoComplete="given-name"/>
                    </div>
                    <div className="mc-field">
                      <label className="mc-label" htmlFor="nom">Nom</label>
                      <input id="nom" type="text" className="mc-input" placeholder="Joël"
                        value={nom} onChange={e => setNom(e.target.value)} required autoComplete="family-name"/>
                    </div>
                  </div>
                  <div className="mc-field">
                    <label className="mc-label" htmlFor="reg-email">Adresse e-mail</label>
                    <input id="reg-email" type="email" className="mc-input" placeholder="vous@exemple.com"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} required autoComplete="email"/>
                  </div>
                  <div className="mc-field">
                    <label className="mc-label" htmlFor="reg-pass">Mot de passe</label>
                    <input id="reg-pass" type="password" className="mc-input" placeholder="••••••••  (min. 6 caractères)"
                      value={regPass} onChange={e => setRegPass(e.target.value)} required autoComplete="new-password"/>
                  </div>
                  <div className="mc-field">
                    <label className="mc-label" htmlFor="reg-pass2">Confirmer le mot de passe</label>
                    <input id="reg-pass2" type="password" className="mc-input" placeholder="••••••••"
                      value={regPass2} onChange={e => setRegPass2(e.target.value)} required autoComplete="new-password"/>
                  </div>
                  {error && (
                    <div className="mc-error">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <circle cx="7.5" cy="7.5" r="6.5" stroke="#B91C1C" strokeWidth="1.3"/>
                        <path d="M7.5 4.5v3.5M7.5 10.5v.5" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  <button type="submit" className="mc-submit" disabled={loading}>
                    {loading ? <><div className="mc-spinner"/> Création du compte…</> : <>Créer mon compte <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
                  </button>
                </form>
              </>
            )}

            <div className="mc-sep">
              <div className="mc-sep-line"/>
              <span className="mc-sep-txt">Garanties cliniques</span>
              <div className="mc-sep-line"/>
            </div>

            <div className="mc-badges">
              <div className="mc-badge">
                <div className="mc-badge-icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="2" y="5" width="11" height="9" rx="2" stroke="#27AE7A" strokeWidth="1.3"/>
                    <path d="M5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="#27AE7A" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="mc-badge-copy">Données chiffrées et anonymisées<span>Aucune donnée nominative transmise à des tiers</span></div>
              </div>
              <div className="mc-badge">
                <div className="mc-badge-icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="5.5" stroke="#27AE7A" strokeWidth="1.3"/>
                    <path d="M5 7.5l2 2 3-3" stroke="#27AE7A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="mc-badge-copy">Outil d'aide, non de diagnostic<span>Résultats à interpréter avec un professionnel de santé</span></div>
              </div>
              <div className="mc-badge">
                <div className="mc-badge-icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1L9.5 5.5H14l-3.7 2.7 1.4 4.3L7.5 10l-4.2 2.5 1.4-4.3L1 5.5h4.5z" stroke="#27AE7A" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="mc-badge-copy">Urgence psychiatrique nationale<span>Numéro d'appel gratuit 24h/24 : 3114</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
