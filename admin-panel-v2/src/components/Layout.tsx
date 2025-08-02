import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MenuSquare, 
  Grid3X3, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  LogOut,
  ChefHat,
  Clock,
  Package2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import storageManager from '../utils/storageManager';
import toast from 'react-hot-toast';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [restaurantName, setRestaurantName] = useState('');
  
  useEffect(() => {
    // Get restaurant name from tenant config
    const subdomain = new URLSearchParams(window.location.search).get('subdomain') || 
                      storageManager.getItem('subdomain');
    if (subdomain) {
      // Format subdomain to restaurant name
      const name = subdomain
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setRestaurantName(name);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      storageManager.removeItem('adminToken');
      storageManager.removeItem('tenantId');
      // Don't remove subdomain - we need it for the login page
      navigate(`/login${location.search}`);
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/team', icon: Users, label: 'Team' },
    { path: '/shifts', icon: Clock, label: 'Shifts' },
    { path: '/menu', icon: MenuSquare, label: 'Menu' },
    { path: '/combos', icon: Package2, label: 'Combos' },
    { path: '/tables', icon: Grid3X3, label: 'Tables' },
    { path: '/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex items-center justify-center h-16 border-b">
          <ChefHat className="h-8 w-8 text-primary-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-800">{restaurantName}</h1>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={`${item.path}${location.search}`}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="absolute bottom-0 w-full p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;