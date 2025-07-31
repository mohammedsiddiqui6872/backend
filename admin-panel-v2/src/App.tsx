import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Menu from './pages/Menu';
import Tables from './pages/Tables';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { authAPI } from './services/api';

// Component to handle navigation with query params preserved
function NavigateWithQuery({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Preserve subdomain in localStorage from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = urlParams.get('subdomain');
    if (subdomain) {
      localStorage.setItem('subdomain', subdomain);
    }

    // Check if user is authenticated
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          await authAPI.getProfile();
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('adminToken');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router basename="/admin-panel">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <NavigateWithQuery to="/" /> : <Login onLogin={() => setIsAuthenticated(true)} />
        } />
        
        <Route path="/" element={
          isAuthenticated ? <Layout /> : <NavigateWithQuery to="/login" />
        }>
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="menu" element={<Menu />} />
          <Route path="tables" element={<Tables />} />
          <Route path="orders" element={<Orders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;