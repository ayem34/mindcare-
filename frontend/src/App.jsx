import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Evaluation  from './pages/Evaluation';
import Historique  from './pages/Historique';
import Resultat    from './pages/Resultat';
import Navbar      from './components/Navbar';

// Route protégée : redirige vers /login si non connecté
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/evaluation" element={<PrivateRoute><Evaluation /></PrivateRoute>} />
        <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
        <Route path="/resultat"   element={<PrivateRoute><Resultat /></PrivateRoute>} />
        <Route path="*"           element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}
