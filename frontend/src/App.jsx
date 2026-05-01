import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function isTokenValid(token) {
  try {
    // JWT uses base64url — convert to standard base64 before decoding
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('token');
  if (!token || !isTokenValid(token)) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    return <Navigate to="/manage-x7k2" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter basename="/tracker">
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
