import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token || !isTokenValid(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    return <Navigate to="/manage-x7k2" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicView />} />
        <Route path="/manage-x7k2" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
