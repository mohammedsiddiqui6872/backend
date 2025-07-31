import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Mail, Lock, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import storageManager from '../utils/storageManager';
import toast from 'react-hot-toast';

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restaurantName, setRestaurantName] = useState('Restaurant');

  useEffect(() => {
    // Get subdomain from URL
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = urlParams.get('subdomain');
    
    if (subdomain) {
      localStorage.setItem('subdomain', subdomain);
      // Format subdomain to restaurant name
      const name = subdomain
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setRestaurantName(name);
      
      // Set tenant ID based on subdomain
      const tenantMap: Record<string, string> = {
        'mughlaimagic': 'rest_mughlaimagic_001',
        'bellavista': 'rest_bellavista_002',
        'hardrockcafe': 'rest_hardrockcafe_003',
      };
      
      const tenantId = tenantMap[subdomain.toLowerCase().replace(/-/g, '')];
      if (tenantId) {
        storageManager.setItem('tenantId', tenantId);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Update storage manager with current subdomain
      const urlParams = new URLSearchParams(window.location.search);
      const subdomain = urlParams.get('subdomain');
      if (subdomain) {
        storageManager.setSubdomain(subdomain);
      }
      
      // Clear any previous tenant data for this subdomain
      storageManager.removeItem('tenantId');
      storageManager.removeItem('adminToken');
      
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      // Store token and user info with subdomain isolation
      storageManager.setItem('adminToken', token);
      storageManager.setItem('adminUser', JSON.stringify(user));
      
      // Store subdomain for consistent UI
      if (subdomain) {
        storageManager.setItem('subdomain', subdomain);
      }
      
      toast.success('Login successful!');
      onLogin();
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Invalid email or password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <ChefHat className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {restaurantName} Admin Panel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your restaurant
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-600">
            <p>Demo credentials:</p>
            <p className="font-mono">admin@{restaurantName.toLowerCase().replace(/\s+/g, '')}.ae</p>
            <p className="font-mono">password123</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;