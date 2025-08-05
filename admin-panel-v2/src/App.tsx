import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Layout from './components/Layout';
import { authAPI } from './services/api';
import storageManager from './utils/storageManager';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { queryClient } from './lib/queryClient';
import './styles/accessibility.css';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Team = lazy(() => import('./pages/Team'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const Menu = lazy(() => import('./pages/Menu'));
const Combos = lazy(() => import('./pages/Combos'));
const Tables = lazy(() => import('./pages/Tables'));
const StaffAssignment = lazy(() => import('./pages/StaffAssignment'));
const Orders = lazy(() => import('./pages/Orders'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Compliance = lazy(() => import('./pages/Compliance'));
const AuditLog = lazy(() => import('./pages/RestaurantAuditLog'));
const TableServiceHistory = lazy(() => import('./components/tables/TableServiceHistory'));
const ServiceDashboard = lazy(() => import('./pages/ServiceDashboardPage'));

// Lazy load PageLoader component
const PageLoader = lazy(() => import('./components/common/PageLoader').then(module => ({ default: module.PageLoader })));

// Component to handle navigation with query params preserved
function NavigateWithQuery({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  // Update document title when tenant info changes
  useEffect(() => {
    if (tenantInfo?.name) {
      // Format restaurant name for better display
      const restaurantName = tenantInfo.name
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      document.title = `${restaurantName} Admin Panel`;
    } else {
      document.title = 'Restaurant Admin Panel';
    }
  }, [tenantInfo]);

  useEffect(() => {
    // Initialize storage manager with subdomain from URL
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = urlParams.get('subdomain');
    if (subdomain) {
      storageManager.setSubdomain(subdomain);
      storageManager.setItem('subdomain', subdomain);
    } else {
      // If no subdomain in URL but we have one stored, add it to URL
      const storedSubdomain = storageManager.getItem('subdomain');
      if (storedSubdomain && window.location.pathname.includes('/admin-panel')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('subdomain', storedSubdomain);
        window.history.replaceState({}, '', newUrl.toString());
      }
    }

    // Check if user is authenticated and get tenant info
    const checkAuth = async () => {
      const token = storageManager.getItem('adminToken');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setIsAuthenticated(true);
          
          // Set tenant info for title
          if (response.data?.tenant) {
            setTenantInfo(response.data.tenant);
            console.log('Tenant info loaded:', response.data.tenant);
          }
        } catch (error) {
          storageManager.removeItem('adminToken');
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
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <Router basename="/admin-panel">
          <Toaster position="top-right" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={
                isAuthenticated ? <NavigateWithQuery to="/" /> : <Login onLogin={async () => {
            setIsAuthenticated(true);
            // Fetch tenant info after login
            try {
              const response = await authAPI.getProfile();
              if (response.data?.tenant) {
                setTenantInfo(response.data.tenant);
              }
            } catch (error) {
              console.error('Failed to fetch tenant info after login:', error);
            }
          }} />
        } />
        
        <Route path="/" element={
          isAuthenticated ? <Layout /> : <NavigateWithQuery to="/login" />
        }>
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="team/roles" element={<RoleManagement />} />
          <Route path="menu" element={<Menu />} />
          <Route path="combos" element={<Combos />} />
          <Route path="tables" element={<Tables />} />
          <Route path="tables/:tableId/history" element={<TableServiceHistory />} />
          <Route path="staff-assignment" element={<StaffAssignment />} />
          <Route path="service-dashboard" element={<ServiceDashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
            </Routes>
          </Suspense>
        </Router>
      </AccessibilityProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;