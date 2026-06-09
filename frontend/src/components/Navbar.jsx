// components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0]?.toUpperCase() ||
    "UTILISATEUR";

  const navLinks = [
    { to: "/dashboard",   label: "Tableau de bord" },
    { to: "/evaluation",  label: "Nouvelle évaluation" },
    { to: "/historique",  label: "Historique" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        .mc-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(245,248,247,0.95);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid #DDE8E3;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .mc-nav-inner {
          max-width: 1140px; margin: 0 auto;
          padding: 0 2.5rem;
          height: 62px;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* Logo */
        .mc-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
        }
        .mc-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: #E8F5F0;
          border: 1px solid rgba(39,174,122,0.22);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .mc-logo-mark:hover { background: rgba(39,174,122,0.18); }
        .mc-logo-text {
          font-family: 'DM Serif Display', serif;
          font-size: 17px; color: #0D2B4E; letter-spacing: -0.02em;
        }
        .mc-logo-ia {
          font-size: 10px; font-weight: 700; color: #27AE7A;
          letter-spacing: 0.08em; text-transform: uppercase; margin-left: 2px;
        }

        /* Links */
        .mc-links {
          display: flex; align-items: center; gap: 2px;
        }
        .mc-link {
          padding: 7px 15px; border-radius: 8px;
          font-size: 13.5px; font-weight: 500;
          color: #5A7499;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .mc-link:hover { background: #E8F5F0; color: #0D2B4E; }
        .mc-link.active {
          background: #E8F5F0;
          color: #1A7A56;
          font-weight: 600;
          border: 1px solid rgba(39,174,122,0.2);
        }

        /* User */
        .mc-right { display: flex; align-items: center; gap: 12px; }
        .mc-user  { display: flex; align-items: center; gap: 9px; }
        .mc-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #27AE7A 0%, #1A7A56 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 700; color: #fff;
          flex-shrink: 0;
          border: 2px solid rgba(39,174,122,0.25);
        }
        .mc-username { font-size: 13px; font-weight: 600; color: #0D2B4E; }
        .mc-sep { width: 1px; height: 20px; background: #DDE8E3; }
        .mc-logout {
          font-size: 13px; font-weight: 600; color: #DC2626;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 6px 11px; border-radius: 7px;
          transition: background 0.15s, color 0.15s;
        }
        .mc-logout:hover { background: rgba(220,38,38,0.07); color: #B91C1C; }

        @media (max-width: 768px) {
          .mc-links { display: none; }
          .mc-username { display: none; }
          .mc-nav-inner { padding: 0 1.25rem; }
        }
      `}</style>

      <nav className="mc-nav">
        <div className="mc-nav-inner">

          {/* Logo */}
          <Link to="/dashboard" className="mc-logo">
            <div className="mc-logo-mark">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <path d="M2 10h3l2-5 3 10 2-6 1.5 3H18"
                      stroke="#27AE7A" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="mc-logo-text">
                MindCare <span className="mc-logo-ia">IA</span>
              </span>
            </div>
          </Link>

          {/* Liens */}
          <div className="mc-links">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to} to={to}
                className={`mc-link${pathname === to ? " active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* User + déconnexion */}
          <div className="mc-right">
            <div className="mc-user">
              <div className="mc-avatar">{displayName.slice(0, 2)}</div>
              <span className="mc-username">{displayName}</span>
            </div>
            <div className="mc-sep" />
            <button className="mc-logout" onClick={logout}>
              Déconnexion
            </button>
          </div>

        </div>
      </nav>
    </>
  );
}
