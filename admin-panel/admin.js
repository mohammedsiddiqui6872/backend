// Save this as admin-panel/admin.js
const { useState, useEffect, useRef } = React;

// Configuration
const API_URL = 'https://restaurant-backend-2wea.onrender.com/api';
const SOCKET_URL = 'https://restaurant-backend-2wea.onrender.com';

// Socket.io setup
let socket = null;

const setupSocket = () => {
  if (!localStorage.getItem('adminToken')) {
    console.log('No auth token, skipping socket connection');
    return;
  }

  socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'], // Try polling first
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token: localStorage.getItem('adminToken')
    }
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('join-admin');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  // Real-time order updates
  socket.on('new-order', (order) => {
    addNotification(`New order #${order.orderNumber} from Table ${order.tableNumber}`, 'info');
    // Add sound notification
    playNotificationSound();
    fetchOrders();
    calculateStats();
  });

  socket.on('order-status-update', (data) => {
    addNotification(`Order #${data.orderNumber} status changed to ${data.status}`, 'info');
    fetchOrders();
  });

  socket.on('table-status-update', (data) => {
    fetchTables();
    fetchCustomerSessions(); // Add this
  });

  socket.on('customer-session-created', () => {
  fetchCustomerSessions(); // Add this
});

  socket.on('low-stock-alert', (data) => {
    addNotification(`Low stock alert: ${data.itemName}`, 'warning');
    fetchInventory();
  });

  socket.on('payment-processed', (data) => {
    addNotification(`Payment received for Table ${data.tableNumber}`, 'success');
    fetchOrders();
    calculateStats();
  });
};

// Add notification sound
const playNotificationSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  audio.play().catch(e => console.log('Audio play failed:', e));
};

// Add print functionality
const printOrder = (order) => {
  const printWindow = window.open('', '_blank');
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order #${order.orderNumber || order._id.slice(-6)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
        h1 { font-size: 24px; text-align: center; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .info { margin-bottom: 20px; }
        .info div { margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { font-weight: bold; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bella Vista Restaurant</h1>
        <p>Order Receipt</p>
      </div>
      <div class="info">
        <div><strong>Order #:</strong> ${order.orderNumber || order._id.slice(-6)}</div>
        <div><strong>Table:</strong> ${order.tableNumber}</div>
        <div><strong>Date:</strong> ${formatDateTime(order.createdAt)}</div>
        <div><strong>Status:</strong> ${order.status}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.price)}</td>
              <td>${formatCurrency(item.price * item.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total">
        Total: ${formatCurrency(order.total)}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

// Add error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <Icon name="alert-triangle" className="lucide-lg text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry for the inconvenience. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxPages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center space-x-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon name="chevron-left" className="lucide-sm" />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            1
          </button>
          {startPage > 2 && <span>...</span>}
        </>
      )}

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded border ${currentPage === page
            ? 'bg-purple-600 text-white border-purple-600'
            : 'border-gray-300 hover:bg-gray-50'
            }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon name="chevron-right" className="lucide-sm" />
      </button>
    </div>
  );
};

// Utility functions
const formatCurrency = (amount) => `AED ${(amount || 0).toFixed(2)}`;
const formatDate = (date) => new Date(date).toLocaleDateString();
const formatDateTime = (date) => new Date(date).toLocaleString();

// Icon Component Helper with fallback
const Icon = ({ name, className = '' }) => {
  // Map of icon names to Unicode symbols as fallbacks
  const fallbackIcons = {
    'edit': '✏️',
    'trash-2': '🗑️',
    'plus': '+',
    'eye': '👁️',
    'x': '✕',
    'search': '🔍',
    'refresh-cw': '↻',
    'bell': '🔔',
    'download': '⬇',
    'loader-2': '⌛',
    'chevron-left': '‹',
    'chevron-right': '›',
    'chevron-up': '↑',
    'chevron-down': '↓',
    'check': '✓',
    'alert-circle': '⚠️',
    'alert-triangle': '⚠️',
    'user-x': '👤✕',
    'user-check': '👤✓',
    'user-plus': '👤+',
    'users': '👥',
    'settings': '⚙️',
    'layout-dashboard': '📊',
    'utensils': '🍴',
    'shopping-cart': '🛒',
    'package': '📦',
    'square': '⬜',
    'trending-up': '📈',
    'clock': '🕐',
    'dollar-sign': '$',
    'star': '⭐',
    'printer': '🖨️',
    'file-text': '📄',
    'file-json': '📋',
    'log-out': '🚪',
    'layers': '📚',
    'pizza': '🍕',
    'coffee': '☕',
    'glass': '🍷',
    'beer': '🍺',
    'drumstick': '🍗',
    'fish': '🐟',
    'carrot': '🥕',
    'apple': '🍎',
    'cake': '🎂',
    'soup': '🍲'
  };

  return (
    <>
      <i className={`lucide lucide-${name} ${className}`}></i>
      {/* Fallback if Lucide doesn't load */}
      <span className="lucide-fallback" style={{ display: 'none' }}>
        {fallbackIcons[name] || '•'}
      </span>
    </>
  );
};

// Chart Component
const SimpleChart = ({ data, type = 'line' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Simple line chart
    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = height - padding - (point.value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = height - padding - (point.value / maxValue) * chartHeight;

      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(point.label, x, height - 10);
    });
  }, [data]);

  return <canvas ref={canvasRef} width={600} height={300} className="w-full" />;
};

// Category Modal Component
const CategoryModal = ({ category, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    icon: category?.icon || 'utensils',
    image: category?.image || '',
    uploadImage: null,
    description: category?.description || '',
    isActive: category?.isActive ?? true
  });

  const availableIcons = [
    'utensils', 'coffee', 'pizza', 'glass',
    'beer', 'drumstick', 'fish', 'carrot',
    'apple', 'cake', 'soup', 'bread-slice',
    'sandwich', 'hamburger', 'salad', 'wine',
    'wine-glass', 'cocktail', 'juice', 'milk',
    'water', 'tea', 'soda', 'ice-cream'
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, uploadImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: '', uploadImage: null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Generate slug from name
    const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
    onSave({
      ...formData,
      slug: slug  // Add the slug field
    });
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-gray-500 opacity-75"></div>

        <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {category ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <Icon name="x" className="lucide-sm" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>
                <div className="space-y-2">
                  {/* Image Preview */}
                  {(formData.image || formData.uploadImage) && (
                    <div className="relative inline-block">
                      <img
                        src={formData.uploadImage || formData.image}
                        alt="Category preview"
                        className="h-32 w-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* File Input */}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                      <span className="text-sm text-gray-700">Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-sm text-gray-500">
                      {formData.uploadImage ? 'New image selected' : 'No file chosen'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload an image to represent this category. Recommended size: 200x200px
                  </p>
                </div>
              </div>

              {/* Icon Selection (as fallback) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Icon (used if no image is uploaded)
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                >
                  {availableIcons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This icon will be used as a fallback when no image is available
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Inactive categories won't be visible to customers
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {category ? 'Update' : 'Create'} Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Login Component
const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        onLogin(data);
      } else {
        // Handle non-JSON error responses
        const contentType = response.headers.get("content-type");
        let errorMessage;
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Login failed';
          } catch (e) {
            errorMessage = 'Login failed';
          }
        } else {
          errorMessage = await response.text() || 'Login failed';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your restaurant
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-pulse">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <Icon name="loader-2" className="animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Admin Panel
const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [customerSessions, setCustomerSessions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    dateRange: 'today'
  });

  // Modal states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentMenuPage, setCurrentMenuPage] = useState(1);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Add categories state
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Current time for duration calculations
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Loading state for tables
  const [tablesLoading, setTablesLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    totalMenuItems: 0,
    activeMenuItems: 0,
    totalUsers: 0,
    activeOrders: 0,
    lowStockItems: 0,
    todayCustomers: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
      fetchAllData();
      setupSocket();
    }

    // Check if Lucide icons are loading
    setTimeout(() => {
      const lucideIcons = document.querySelectorAll('.lucide');
      if (lucideIcons.length > 0 && !lucideIcons[0].innerHTML) {
        console.warn('Lucide icons may not be loading properly. Using fallback text.');
        // Add a class to body to show fallbacks
        document.body.classList.add('lucide-fallback-mode');
      }
    }, 1000);

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Update the calculateStats function to use useEffect
  useEffect(() => {
    calculateStats();
  }, [orders, menuItems, inventory, users, tables]);

  // Add useEffect to fetch categories
  useEffect(() => {
    if (activeTab === 'categories' && isAuthenticated) {
      fetchCategories();
    }
  }, [activeTab, isAuthenticated]);

  // Fetch tables when tables tab is active
  useEffect(() => {
    if (activeTab === 'tables' && isAuthenticated) {
      fetchTables();
      // Refresh tables every 30 seconds when on tables tab
      const interval = setInterval(() => {
        fetchTables();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, isAuthenticated]);

  // Update current time every minute for duration calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Add batch operations for menu items
  const handleBulkStatusUpdate = async (status) => {
    if (selectedItems.length === 0) return;

    try {
      const response = await fetch(`${API_URL}/admin/menu/bulk-update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          items: selectedItems,
          updateFields: { available: status }
        })
      });

      if (response.ok) {
        await fetchMenuItems();
        setSelectedItems([]);
        addNotification(`Updated ${selectedItems.length} items`, 'success');
      }
    } catch (error) {
      console.error('Error updating items:', error);
      addNotification('Error updating items', 'error');
    }
  };

  // Add CSV export functionality
  const exportToCSV = (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    return `AED ${(amount || 0).toFixed(2)}`;
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  // Add debounce for search
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Update search to use debounce
  const debouncedSearch = useRef(
    debounce((query) => {
      setSearchQuery(query);
    }, 300)
  ).current;

  const handleLogin = (data) => {
    setIsAuthenticated(true);
    setUser(data.user);
    fetchAllData();
    // setupSocket();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setUser(null);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  });

  // Helper function to handle API responses
  const handleApiResponse = async (response) => {
    if (!response.ok) {
      // Try to parse JSON error, otherwise use status text
      let errorMessage;
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || `Error: ${response.status}`;
        } catch (e) {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
      } else {
        // Non-JSON response (like rate limiting messages)
        errorMessage = await response.text() || `Error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMenuItems(),
        fetchOrders(),
        fetchUsers(),
        fetchTables(),
        fetchInventory(),
        fetchAnalytics(),
        fetchCategories()
      ]);
      calculateStats();
    } catch (error) {
      console.error('Error fetching data:', error);
      addNotification('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    const response = await fetch(`${API_URL}/admin/menu?all=true`, {
      headers: getAuthHeaders()
    });
    const data = await handleApiResponse(response);
    setMenuItems(data.items || []);
  };

  const fetchOrders = async () => {
    const response = await fetch(`${API_URL}/orders`, {
      headers: getAuthHeaders()
    });
    const data = await handleApiResponse(response);
    setOrders(data || []);
  };

  const fetchUsers = async () => {
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: getAuthHeaders()
    });
    const data = await handleApiResponse(response);
    setUsers(data || []);
  };


  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/inventory`, {
        headers: getAuthHeaders()
      });
      const data = await handleApiResponse(response);
      setInventory(data || []);
    } catch (error) {
      console.log('Inventory API not available:', error.message);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/analytics/dashboard`, {
        headers: getAuthHeaders()
      });
      const data = await handleApiResponse(response);
      setAnalytics(data || {});
    } catch (error) {
      console.log('Analytics API not available:', error.message);
    }
  };

  // Add fetch categories function
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/categories`, {
        headers: getAuthHeaders()
      });
      const data = await handleApiResponse(response);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      addNotification('Error fetching categories', 'error');
    }
  };

  const fetchCustomerSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/customer-sessions/active`, {
        headers: getAuthHeaders()
      });
      const data = await handleApiResponse(response);
      setCustomerSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching customer sessions:', error.message);
    }
  };

  const fetchTables = async () => {
    try {
      // Don't reset tables if we already have data (prevents flickering)
      if (tables.length === 0) {
        setTablesLoading(true);
      }
      const response = await fetch(`${API_URL}/admin/tables`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // The admin/tables endpoint now returns all data in one request
        setTables(data.tables || []);
        
        // Update stats if available
        if (data.stats) {
          // You can use these stats for the summary cards
          console.log('Table stats:', data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      addNotification('Error loading tables', 'error');
    } finally {
      setTablesLoading(false);
    }
  };

  // Handle table checkout
  const handleTableCheckout = async (tableNumber, activeOrders) => {
    if (!activeOrders || activeOrders.length === 0) {
      addNotification('No active orders to checkout', 'error');
      return;
    }
    
    const totalAmount = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    if (confirm(`Process checkout for table ${tableNumber}?\nTotal amount: ${formatCurrency(totalAmount)}`)) {
      try {
        // Process payment for all orders
        for (const order of activeOrders) {
          const response = await fetch(`${API_URL}/orders/${order._id}/payment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              paymentMethod: 'cash',
              paymentStatus: 'paid',
              amountPaid: order.total
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to process payment for order ${order._id}`);
          }
        }
        
        addNotification('Checkout completed successfully', 'success');
        fetchTables(); // Refresh table data
      } catch (error) {
        console.error('Checkout error:', error);
        addNotification('Error processing checkout', 'error');
      }
    }
  };

  // Handle ending customer session
  const handleEndCustomerSession = async (sessionId, tableNumber) => {
    try {
      if (!window.confirm(`Are you sure you want to end the customer session for Table ${tableNumber}?`)) {
        return;
      }

      const response = await fetch(`${API_URL}/customer-sessions/${sessionId}/close`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        addNotification(`Customer session ended for Table ${tableNumber}`, 'success');
        await fetchTables(); // Refresh tables
      } else {
        const error = await response.json();
        addNotification(error.error || 'Failed to end customer session', 'error');
      }
    } catch (error) {
      console.error('Error ending customer session:', error);
      addNotification('Error ending customer session', 'error');
    }
  };

  // Handle table checkout - DUPLICATE REMOVED (using the first declaration at line 1058)
  /* const handleTableCheckout = async (tableNumber, activeOrders) => {
    try {
      if (!activeOrders || activeOrders.length === 0) {
        addNotification('No active orders to checkout', 'error');
        return;
      }

      // Calculate total amount
      const totalAmount = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      if (!window.confirm(`Process checkout for Table ${tableNumber}?\n\nTotal: $${totalAmount.toFixed(2)}\nOrders: ${activeOrders.length}`)) {
        return;
      }

      // Process payment for all active orders
      const paymentPromises = activeOrders.map(order => 
        fetch(`${API_URL}/orders/${order._id}/payment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            paymentMethod: 'cash', // Default to cash, can be enhanced later
            amountPaid: order.total,
            tip: 0
          })
        })
      );

      const results = await Promise.all(paymentPromises);
      const failedPayments = results.filter(r => !r.ok);

      if (failedPayments.length > 0) {
        addNotification(`Failed to process ${failedPayments.length} order(s)`, 'error');
        return;
      }

      // Find and close customer session if exists
      const sessionResponse = await fetch(
        `${API_URL}/customer-sessions/active/${tableNumber}`,
        { headers: getAuthHeaders() }
      );

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.activeSession && sessionData.activeSession._id) {
          // Checkout the session
          await fetch(`${API_URL}/customer-sessions/${sessionData.activeSession._id}/checkout`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
        }
      }

      // Refresh tables data
      await fetchTables();
      addNotification(`Successfully processed checkout for Table ${tableNumber}`, 'success');

    } catch (error) {
      console.error('Error processing checkout:', error);
      addNotification('Error processing checkout', 'error');
    }
  }; */

  // Add category CRUD functions
  const handleSaveCategory = async (categoryData) => {
    try {
      const url = editingCategory
        ? `${API_URL}/admin/categories/${editingCategory._id}`
        : `${API_URL}/admin/categories`;

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        await fetchCategories();
        setShowCategoryModal(false);
        setEditingCategory(null);
        addNotification(`Category ${editingCategory ? 'updated' : 'created'} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      addNotification('Error saving category', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await fetch(`${API_URL}/admin/categories/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          await fetchCategories();
          addNotification('Category deleted successfully', 'success');
        } else {
          const error = await response.json();
          addNotification(error.error || 'Error deleting category', 'error');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        addNotification('Error deleting category', 'error');
      }
    }
  };

  const handleReorderCategory = async (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < categories.length) {
      [newCategories[index], newCategories[targetIndex]] =
        [newCategories[targetIndex], newCategories[index]];

      // Update display order
      const categoryOrder = newCategories.map((cat, idx) => ({
        id: cat._id,
        order: idx
      }));

      try {
        const response = await fetch(`${API_URL}/admin/categories/reorder`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ categoryOrder })
        });

        if (response.ok) {
          setCategories(newCategories);
          addNotification('Categories reordered successfully', 'success');
        }
      } catch (error) {
        console.error('Error reordering categories:', error);
        addNotification('Error reordering categories', 'error');
      }
    }
  };

  const calculateStats = () => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    const lowStock = inventory.filter(i => i.currentStock <= i.minStock);

    setStats({
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalMenuItems: menuItems.length,
      activeMenuItems: menuItems.filter(i => i.available).length,
      totalUsers: users.filter(u => u.isActive).length,
      activeOrders: activeOrders.length,
      lowStockItems: lowStock.length,
      todayCustomers: new Set(todayOrders.map(o => o.customerPhone || o.tableNumber)).size
    });
  };

  // Then add the useEffect after the function definition
  useEffect(() => {
    if (orders.length > 0 || menuItems.length > 0 || users.length > 0) {
      calculateStats();
    }
  }, [orders, menuItems, inventory, users, tables]);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10));
  };

  // CRUD Operations
  const handleSaveMenuItem = async (itemData) => {
    try {
      const url = editingItem
        ? `${API_URL}/admin/menu/${editingItem._id}`
        : `${API_URL}/admin/menu`;

      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });

      if (response.ok) {
        await fetchMenuItems();
        setShowMenuModal(false);
        setEditingItem(null);
        addNotification(`Menu item ${editingItem ? 'updated' : 'created'} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      addNotification('Error saving menu item', 'error');
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${API_URL}/admin/menu/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          await fetchMenuItems();
          addNotification('Menu item deleted successfully', 'success');
        }
      } catch (error) {
        console.error('Error deleting menu item:', error);
        addNotification('Error deleting menu item', 'error');
      }
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      const response = await fetch(`${API_URL}/admin/menu/${id}/availability`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        await fetchMenuItems();
        addNotification('Availability updated', 'success');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    if (window.confirm(`Delete ${selectedItems.length} items?`)) {
      try {
        await Promise.all(
          selectedItems.map(id =>
            fetch(`${API_URL}/admin/menu/${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            })
          )
        );
        await fetchMenuItems();
        setSelectedItems([]);
        addNotification('Items deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting items:', error);
        addNotification('Error deleting items', 'error');
      }
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ menuItems, orders, users }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `restaurant-data-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Filter functions
  const getFilteredItems = () => {
    let filtered = menuItems;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    return filtered;
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.dateRange === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(order =>
        new Date(order.createdAt).toDateString() === today
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-20 items-center justify-center border-b bg-gradient-to-r from-purple-600 to-pink-600">
          <h1 className="text-2xl font-bold text-white">Bella Vista Admin</h1>
        </div>

        <nav className="mt-5 px-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
            { id: 'menu', label: 'Menu Management', icon: 'utensils' },
            { id: 'categories', label: 'Categories', icon: 'layers' },
            { id: 'orders', label: 'Orders', icon: 'shopping-cart' },
            { id: 'inventory', label: 'Inventory', icon: 'package' },
            { id: 'users', label: 'Staff Management', icon: 'users' },
            { id: 'tables', label: 'Tables', icon: 'square' },
            { id: 'analytics', label: 'Analytics', icon: 'trending-up' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-2 py-2 mt-1 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                ? 'bg-purple-100 text-purple-900'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Icon name={item.icon} className="lucide-sm mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
          >
            <Icon name="log-out" className="lucide-sm mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white shadow-lg sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
              </h2>

              <div className="flex items-center space-x-4">
                {/* Search */}
                {['menu', 'orders', 'users'].includes(activeTab) && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <Icon name="search" className="lucide-sm absolute left-3 top-3 text-gray-400" />
                  </div>
                )}

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 hover:bg-gray-100 rounded-lg relative"
                  >
                    <Icon name="bell" className="lucide-sm" />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="p-4 text-gray-500 text-sm">No notifications</p>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 ${notif.type === 'error' ? 'bg-red-50' :
                            notif.type === 'success' ? 'bg-green-50' : ''
                            }`}>
                            <p className="text-sm">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTime(notif.timestamp)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchAllData}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  <Icon name="refresh-cw" className={`lucide-sm ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {loading && activeTab === 'dashboard' ? (
            <div className="flex justify-center items-center h-64">
              <Icon name="loader-2" className="lucide-lg animate-spin text-purple-600" />
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && (
                <div>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {[
                      { label: "Today's Orders", value: stats.todayOrders, icon: 'shopping-cart', color: 'blue' },
                      { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: 'dollar-sign', color: 'green' },
                      { label: 'Active Orders', value: stats.activeOrders, icon: 'clock', color: 'yellow' },
                      { label: 'Low Stock Items', value: stats.lowStockItems, icon: 'alert-circle', color: 'red' },
                      { label: 'Active Menu Items', value: `${stats.activeMenuItems}/${stats.totalMenuItems}`, icon: 'utensils', color: 'purple' },
                      { label: 'Active Staff', value: stats.totalUsers, icon: 'users', color: 'indigo' },
                      { label: "Today's Customers", value: stats.todayCustomers, icon: 'user-check', color: 'pink' },
                      { label: 'Active Tables', value: `${tables.filter(t => t.status === 'occupied').length}/${tables.length}`, icon: 'square', color: 'gray' }
                    ].map((stat, index) => (
                      <div key={index} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                        <div className="p-5">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 bg-${stat.color}-100 rounded-md p-3`}>
                              <Icon name={stat.icon} className={`lucide-sm text-${stat.color}-600`} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
                                <dd className="text-lg font-semibold text-gray-900">{stat.value}</dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 7 Days)</h3>
                      <div className="chart-container">
                        <SimpleChart
                          data={[
                            { label: 'Mon', value: 2500 },
                            { label: 'Tue', value: 3200 },
                            { label: 'Wed', value: 2800 },
                            { label: 'Thu', value: 3500 },
                            { label: 'Fri', value: 4200 },
                            { label: 'Sat', value: 4800 },
                            { label: 'Sun', value: stats.todayRevenue }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Top Selling Items</h3>
                      <div className="space-y-3">
                        {menuItems
                          .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
                          .slice(0, 5)
                          .map((item, index) => (
                            <div key={item._id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {index + 1}. {item.name}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {item.soldCount || 0} sold
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b">
                      <h3 className="text-lg font-semibold">Recent Orders</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Table
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{order.orderNumber || order._id.slice(-6)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Table {order.tableNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(order.total)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDateTime(order.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Management */}
              {activeTab === 'menu' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                          <option key={category._id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      {selectedItems.length > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                        >
                          <Icon name="trash-2" className="lucide-sm mr-2" />
                          Delete ({selectedItems.length})
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportData}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
                      >
                        <Icon name="download" className="lucide-sm mr-2" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setShowMenuModal(true);
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                      >
                        <Icon name="plus" className="lucide-sm mr-2" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(getFilteredItems().map(i => i._id));
                                } else {
                                  setSelectedItems([]);
                                }
                              }}
                              checked={selectedItems.length === getFilteredItems().length && getFilteredItems().length > 0}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sold
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredItems().map((item) => (
                          <tr key={item._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item._id]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(id => id !== item._id));
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-10 w-10 rounded-full mr-3 object-cover"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">ID: {item.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.price)}
                              {item.isSpecial && (
                                <span className="ml-2 text-xs text-red-600">-{item.discount}%</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleAvailability(item._id)}
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                              >
                                {item.available ? 'Available' : 'Unavailable'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.stockQuantity || '∞'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.soldCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowMenuModal(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                                  title="Edit item"
                                >
                                  <Icon name="edit" className="lucide-sm mr-1" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item._id)}
                                  className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                  title="Delete item"
                                >
                                  <Icon name="trash-2" className="lucide-sm mr-1" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Category Management */}
              {activeTab === 'categories' && (
                <div>
                  <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Category Management</h2>
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setShowCategoryModal(true);
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                    >
                      <Icon name="plus" className="lucide-sm mr-2" />
                      Add Category
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Slug
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Icon
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categories.map((category, index) => (
                          <tr key={category._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReorderCategory(index, 'up')}
                                  disabled={index === 0}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <Icon name="chevron-up" className="lucide-sm" />
                                </button>
                                <button
                                  onClick={() => handleReorderCategory(index, 'down')}
                                  disabled={index === categories.length - 1}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <Icon name="chevron-down" className="lucide-sm" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{category.name}</div>
                              <div className="text-sm text-gray-500">{category.nameAr}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.slug}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Icon name={category.icon} className="lucide-sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {category.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => {
                                  setEditingCategory(category);
                                  setShowCategoryModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this category?')) {
                                    try {
                                      const response = await fetch(`${API_URL}/admin/categories/${category._id}`, {
                                        method: 'DELETE',
                                        headers: getAuthHeaders()
                                      });
                                      
                                      if (response.ok) {
                                        addNotification('Category deleted successfully', 'success');
                                        fetchCategories();
                                      } else {
                                        const error = await response.json();
                                        addNotification(error.error || 'Failed to delete category', 'error');
                                      }
                                    } catch (error) {
                                      console.error('Error deleting category:', error);
                                      addNotification('Error deleting category', 'error');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Orders */}
              {activeTab === 'orders' && (
                <div>
                  <div className="mb-6 flex items-center gap-4">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="served">Served</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    >
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredOrders().map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                #{order.orderNumber || order._id.slice(-6)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.orderType || 'dine-in'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Table {order.tableNumber}
                              {order.customerName && (
                                <div className="text-xs">{order.customerName}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.items?.length || 0} items
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={order.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const response = await fetch(`${API_URL}/orders/${order._id}/status`, {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ status: newStatus })
                                    });
                                    if (response.ok) {
                                      await fetchOrders();
                                      addNotification('Order status updated', 'success');
                                    }
                                  } catch (error) {
                                    console.error('Error updating order status:', error);
                                  }
                                }}
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready">Ready</option>
                                <option value="served">Served</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(order.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderModal(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                                  title="View order details"
                                >
                                  <Icon name="eye" className="lucide-sm mr-1" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => printOrder(order)}
                                  className="inline-flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
                                  title="Print order"
                                >
                                  <Icon name="printer" className="lucide-sm mr-1" />
                                  <span>Print</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Inventory */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Low Stock Alerts</h3>
                    {inventory.filter(i => i.currentStock <= i.minStock).length === 0 ? (
                      <p className="text-gray-500">All items are well stocked!</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory
                          .filter(i => i.currentStock <= i.minStock)
                          .map((item) => (
                            <div key={item._id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-red-900">{item.menuItem?.name || 'Unknown Item'}</h4>
                                <Icon name="alert-triangle" className="lucide-sm text-red-600" />
                              </div>
                              <p className="text-sm text-red-700">
                                Current Stock: {item.currentStock} {item.unit}
                              </p>
                              <p className="text-sm text-red-700">
                                Min Stock: {item.minStock} {item.unit}
                              </p>
                              <button className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">
                                Reorder Now →
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b">
                      <h3 className="text-lg font-semibold">All Inventory Items</h3>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Min/Max Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Restocked
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {inventory.map((item) => (
                          <tr key={item._id} className={item.currentStock <= item.minStock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.menuItem?.name || 'Unknown Item'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className={`text-sm font-medium ${item.currentStock <= item.minStock ? 'text-red-600' : 'text-gray-900'
                                  }`}>
                                  {item.currentStock}
                                </span>
                                {item.currentStock <= item.minStock && (
                                  <Icon name="alert-circle" className="lucide-sm ml-2 text-red-600" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.minStock} / {item.maxStock}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.lastRestocked ? formatDate(item.lastRestocked) : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded border border-indigo-300"
                                onClick={() => {
                                  // Add update stock modal functionality here
                                  addNotification('Stock update feature coming soon!', 'info');
                                }}
                              >
                                <Icon name="package" className="lucide-sm mr-1" />
                                Update Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Staff Management */}
              {activeTab === 'users' && (
                <div>
                  <div className="mb-6 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Staff Members</h3>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setShowUserModal(true);
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                    >
                      <Icon name="plus" className="lucide-sm mr-2" />
                      Add Staff
                    </button>
                  </div>

                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '200px' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-purple-600 font-medium">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.phone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserModal(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                                  title="Edit user"
                                >
                                  <Icon name="edit" className="lucide-sm mr-1" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} this user?`)) {
                                      try {
                                        await fetch(`${API_URL}/admin/users/${user._id}/status`, {
                                          method: 'PATCH',
                                          headers: getAuthHeaders()
                                        });
                                        await fetchUsers();
                                        addNotification('User status updated', 'success');
                                      } catch (error) {
                                        console.error('Error updating user:', error);
                                      }
                                    }
                                  }}
                                  className={`inline-flex items-center px-2 py-1 text-sm rounded ${user.isActive
                                      ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                      : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                    }`}
                                  title={user.isActive ? 'Deactivate user' : 'Activate user'}
                                >
                                  <Icon name={user.isActive ? 'user-x' : 'user-check'} className="lucide-sm mr-1" />
                                  <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`)) {
                                      try {
                                        const response = await fetch(`${API_URL}/admin/users/${user._id}`, {
                                          method: 'DELETE',
                                          headers: getAuthHeaders()
                                        });
                                        
                                        const data = await response.json();
                                        
                                        if (response.ok) {
                                          await fetchUsers();
                                          addNotification('User deleted successfully', 'success');
                                        } else {
                                          addNotification(data.error || 'Failed to delete user', 'error');
                                        }
                                      } catch (error) {
                                        console.error('Error deleting user:', error);
                                        addNotification('Error deleting user', 'error');
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                  title="Delete user permanently"
                                >
                                  <Icon name="trash-2" className="lucide-sm mr-1" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tables */}
              {activeTab === 'tables' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Table Management</h2>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-100 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-800">Available</h3>
                      <p className="text-2xl font-bold text-green-900">
                        {tables.filter(t => t.status === 'available').length}
                      </p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-red-800">Occupied</h3>
                      <p className="text-2xl font-bold text-red-900">
                        {tables.filter(t => t.status === 'occupied').length}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-800">Active Sessions</h3>
                      <p className="text-2xl font-bold text-blue-900">
                        {tables.filter(t => t.customerSession).length}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-800">Total Guests</h3>
                      <p className="text-2xl font-bold text-purple-900">
                        {tables.reduce((sum, t) => sum + (t.customerSession?.occupancy || 0), 0)}
                      </p>
                    </div>
                  </div>

                  {/* Tables Grid */}
                  {tablesLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {tables.map((table) => {
                      const currentTime = new Date();
                      
                      // Remove debug logs for production
                      
                      return (
                        <div
                          key={table._id}
                          className={`bg-white rounded-lg shadow-lg p-4 border-2 ${
                            table.customerSession || (table.activeOrders && table.activeOrders.length > 0) 
                              ? 'border-red-500' 
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Table Header */}
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-bold">Table {table.number}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              table.customerSession || (table.activeOrders && table.activeOrders.length > 0)
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {table.customerSession || (table.activeOrders && table.activeOrders.length > 0) ? 'occupied' : 'available'}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-3">{table.capacity || 4} seats</p>

                          {/* Assigned Waiter Info */}
                          {table.waiterInfo && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-purple-800">Assigned Waiter:</p>
                              <p className="text-sm text-gray-700">{table.waiterInfo.name || 'Unknown'}</p>
                              {table.tableState && table.tableState.assignedAt && (
                                <>
                                  <p className="text-xs text-gray-600">Since: {new Date(table.tableState.assignedAt).toLocaleTimeString()}</p>
                                  <p className="text-xs text-gray-600">Duration: {Math.round((currentTime - new Date(table.tableState.assignedAt)) / 60000)}m</p>
                                </>
                              )}
                            </div>
                          )}

                          {/* Customer Session Info */}
                          {table.customerSession && table.customerSession.customerName && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-blue-800 mb-1">Current Customer:</p>
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">
                                  {table.customerSession.customerName}
                                </span>
                                <span className="flex items-center text-sm text-blue-700">
                                  <i className="lucide lucide-users" style={{ width: '14px', height: '14px', marginRight: '4px' }}></i>
                                  {table.customerSession.occupancy || 1} guests
                                </span>
                              </div>
                              
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-600">Check-in: {new Date(table.customerSession.loginTime).toLocaleTimeString()}</p>
                                <p className="text-xs text-gray-600">Duration: {Math.round((currentTime - new Date(table.customerSession.loginTime)) / 60000)}m</p>
                                {table.customerSession.orders && (
                                  <p className="text-xs text-gray-600">{table.customerSession.orders.length} orders</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Active Orders */}
                          {table.activeOrders && table.activeOrders.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-yellow-800 mb-2">
                                Active Orders ({table.activeOrders.length})
                              </p>
                              {table.activeOrders.map((order) => (
                                <div key={order._id} className="mb-3 bg-yellow-50 rounded p-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-sm">#{order.orderNumber || order._id.slice(-4)}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      order.status === 'served' ? 'bg-green-100 text-green-800' :
                                      order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                                      order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  
                                  {/* Order Items */}
                                  <ul className="text-xs text-gray-700 mb-1">
                                    {order.items && order.items.slice(0, 3).map((item, idx) => (
                                      <li key={idx}>• {item.quantity}x {item.name}</li>
                                    ))}
                                    {order.items && order.items.length > 3 && (
                                      <li className="text-gray-500">... and {order.items.length - 3} more items</li>
                                    )}
                                  </ul>
                                  
                                  <p className="text-xs font-semibold text-yellow-900">
                                    Total: {formatCurrency(order.total)}
                                  </p>
                                </div>
                              ))}
                              
                              {/* Grand Total */}
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <p className="text-sm font-bold text-gray-900">
                                  Grand Total: {formatCurrency(table.activeOrders.reduce((sum, o) => sum + (o.total || 0), 0))}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {(table.customerSession || (table.activeOrders && table.activeOrders.length > 0)) && (
                            <div className="space-y-2">
                              {table.activeOrders && table.activeOrders.length > 0 && (
                                <button
                                  onClick={() => handleTableCheckout(table.number, table.activeOrders)}
                                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                  Checkout
                                </button>
                              )}
                              {table.customerSession && table.customerSession._id && (
                                <button
                                  onClick={() => handleEndCustomerSession(table.customerSession._id, table.number)}
                                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                  End Customer Session
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Performance Analytics</h3>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                          Today
                        </button>
                        <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                          This Week
                        </button>
                        <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                          This Month
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue by Category */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-md font-semibold mb-4">Revenue by Category</h4>
                      <div className="space-y-3">
                        {['Appetizers', 'Main Courses', 'Desserts', 'Beverages'].map((cat, index) => {
                          const percentage = [35, 40, 15, 10][index];
                          return (
                            <div key={cat}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">{cat}</span>
                                <span className="text-sm font-medium">{percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-md font-semibold mb-4">Peak Hours Today</h4>
                      <div className="space-y-2">
                        {[
                          { time: '12:00 - 14:00', orders: 45, revenue: 3200 },
                          { time: '19:00 - 21:00', orders: 62, revenue: 4800 },
                          { time: '14:00 - 16:00', orders: 28, revenue: 2100 },
                          { time: '21:00 - 23:00', orders: 35, revenue: 2600 }
                        ].map((slot) => (
                          <div key={slot.time} className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm">{slot.time}</span>
                            <div className="text-right">
                              <p className="text-sm font-medium">{slot.orders} orders</p>
                              <p className="text-xs text-gray-500">{formatCurrency(slot.revenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Insights */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-md font-semibold mb-4">Customer Insights</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Icon name="users" className="lucide-lg mx-auto mb-2 text-blue-600" />
                          <p className="text-2xl font-bold text-blue-900">156</p>
                          <p className="text-sm text-blue-700">Total Customers</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <Icon name="user-plus" className="lucide-lg mx-auto mb-2 text-green-600" />
                          <p className="text-2xl font-bold text-green-900">28</p>
                          <p className="text-sm text-green-700">New Today</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Icon name="clock" className="lucide-lg mx-auto mb-2 text-purple-600" />
                          <p className="text-2xl font-bold text-purple-900">42m</p>
                          <p className="text-sm text-purple-700">Avg. Dining Time</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <Icon name="star" className="lucide-lg mx-auto mb-2 text-yellow-600" />
                          <p className="text-2xl font-bold text-yellow-900">4.8</p>
                          <p className="text-sm text-yellow-700">Avg. Rating</p>
                        </div>
                      </div>
                    </div>

                    {/* Staff Performance */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h4 className="text-md font-semibold mb-4">Top Performing Staff</h4>
                      <div className="space-y-3">
                        {users.slice(0, 5).map((user) => (
                          <div key={user._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                <span className="text-purple-600 text-sm font-medium">
                                  {user.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{Math.floor(Math.random() * 50 + 20)} orders</p>
                              <p className="text-xs text-gray-500">Today</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              {activeTab === 'settings' && (
                <div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-6">Restaurant Settings</h3>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium mb-3">General Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Restaurant Name
                            </label>
                            <input
                              type="text"
                              defaultValue="Bella Vista"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contact Number
                            </label>
                            <input
                              type="text"
                              defaultValue="+971 4 123 4567"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              defaultValue="info@bellavista.ae"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Currency
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500">
                              <option>AED - UAE Dirham</option>
                              <option>USD - US Dollar</option>
                              <option>EUR - Euro</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-medium mb-3">Operating Hours</h4>
                        <div className="space-y-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <div key={day} className="flex items-center justify-between">
                              <span className="text-sm w-24">{day}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  defaultValue="10:00"
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span>to</span>
                                <input
                                  type="time"
                                  defaultValue="23:00"
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <label className="flex items-center">
                                  <input type="checkbox" defaultChecked className="mr-1" />
                                  <span className="text-sm">Open</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-medium mb-3">Tax & Service Charges</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tax Rate (%)
                            </label>
                            <input
                              type="number"
                              defaultValue="5"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Service Charge (%)
                            </label>
                            <input
                              type="number"
                              defaultValue="10"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Delivery Charge
                            </label>
                            <input
                              type="number"
                              defaultValue="15"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                          Save Settings
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showMenuModal && <MenuItemModal
        item={editingItem}
        onSave={handleSaveMenuItem}
        onClose={() => {
          setShowMenuModal(false);
          setEditingItem(null);
        }}
        categories={categories}
      />}

      {showOrderModal && selectedOrder && <OrderDetailsModal
        order={selectedOrder}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }}
      />}

      {showUserModal && <UserModal
        user={selectedUser}
        onSave={async (userData) => {
          try {
            const url = selectedUser
              ? `${API_URL}/admin/users/${selectedUser._id}`
              : `${API_URL}/admin/users`;

            const method = selectedUser ? 'PUT' : 'POST';

            {/* Don't send empty password on update */ }
            const dataToSend = { ...userData };
            if (selectedUser && !dataToSend.password) {
              delete dataToSend.password;
            }

            const response = await fetch(url, {
              method,
              headers: getAuthHeaders(),
              body: JSON.stringify(dataToSend)
            });

            const data = await response.json();

            if (response.ok) {
              await fetchUsers();
              setShowUserModal(false);
              setSelectedUser(null);
              addNotification(data.message || `User ${selectedUser ? 'updated' : 'created'} successfully`, 'success');
            } else {
              addNotification(data.error || 'Failed to save user', 'error');
            }
          } catch (error) {
            console.error('Error saving user:', error);
            addNotification('Network error. Please try again.', 'error');
          }
        }}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
      />}

      {showCategoryModal && <CategoryModal
        category={editingCategory}
        onSave={async (categoryData) => {
          try {
            const url = editingCategory
              ? `${API_URL}/admin/categories/${editingCategory._id}`
              : `${API_URL}/admin/categories`;

            const method = editingCategory ? 'PUT' : 'POST';

            const response = await fetch(url, {
              method: method,
              headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(categoryData)
            });

            const data = await response.json();

            if (response.ok) {
              await fetchCategories();
              setShowCategoryModal(false);
              setEditingCategory(null);
              addNotification(`Category ${editingCategory ? 'updated' : 'created'} successfully`, 'success');
            } else {
              addNotification(data.error || 'Failed to save category', 'error');
            }
          } catch (error) {
            console.error('Error saving category:', error);
            addNotification('Network error. Please try again.', 'error');
          }
        }}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
      />}
    </div>
  );
};

// Menu Item Modal Component
const MenuItemModal = ({ item, onSave, onClose, categories }) => {
  const [formData, setFormData] = useState({
    id: item?.id || 'Auto-generated',
    name: item?.name || '',
    nameAr: item?.nameAr || '',
    category: item?.category || 'appetizers',
    price: item?.price || '',
    cost: item?.cost || '',
    description: item?.description || '',
    descriptionAr: item?.descriptionAr || '',
    image: item?.image || '',
    available: item?.available ?? true,
    inStock: item?.inStock ?? true,
    stockQuantity: item?.stockQuantity || '',
    prepTime: item?.prepTime || 15,
    allergens: item?.allergens || [],
    dietary: item?.dietary || [],
    calories: item?.calories || '',
    protein: item?.protein || '',
    carbs: item?.carbs || '',
    fat: item?.fat || '',
    isSpecial: item?.isSpecial || false,
    discount: item?.discount || 0,
    recommended: item?.recommended || false,
    featured: item?.featured || false,
    tags: item?.tags || [],
    customizations: item?.customizations || {}
  });

  const [newAllergen, setNewAllergen] = useState('');
  const [newDietaryTag, setNewDietaryTag] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCustomizationCategory, setNewCustomizationCategory] = useState('');
  const [newCustomizationOption, setNewCustomizationOption] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Don't send ID when creating new items - let backend auto-generate it
    const dataToSave = { ...formData };
    if (!item && dataToSave.id === 'Auto-generated') {
      delete dataToSave.id;
    }
    onSave(dataToSave);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, uploadImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const addAllergen = () => {
    if (newAllergen && !formData.allergens.includes(newAllergen)) {
      setFormData({ ...formData, allergens: [...formData.allergens, newAllergen] });
      setNewAllergen('');
    }
  };

  const removeAllergen = (allergen) => {
    setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen) });
  };

  const addDietaryTag = () => {
    if (newDietaryTag && !formData.dietary.includes(newDietaryTag)) {
      setFormData({ ...formData, dietary: [...formData.dietary, newDietaryTag] });
      setNewDietaryTag('');
    }
  };

  const removeDietaryTag = (tag) => {
    setFormData({ ...formData, dietary: formData.dietary.filter(d => d !== tag) });
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {item ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Icon name="x" className="lucide-sm" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Basic Information */}
                <div className="col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <input
                    type="text"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                    value={formData.id}
                    readOnly
                    disabled={!item}
                    title={!item ? "ID will be auto-generated on save" : "ID cannot be changed"}
                  />
                  {!item && <p className="mt-1 text-xs text-gray-500">ID will be auto-generated when you save</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category._id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Name (English)</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Name (Arabic)</label>
                  <input
                    type="text"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description (English)</label>
                  <textarea
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description (Arabic)</label>
                  <textarea
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    dir="rtl"
                  />
                </div>

                {/* Image */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block text-sm text-gray-500"
                    />
                    {(formData.image || formData.uploadImage) && (
                      <img
                        src={formData.uploadImage || formData.image}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Stock & Availability */}
                <div className="col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Stock & Availability</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Prep Time (minutes)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Available for ordering</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                      checked={formData.inStock}
                      onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">In Stock</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                      checked={formData.isSpecial}
                      onChange={(e) => setFormData({ ...formData, isSpecial: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Special Item</span>
                  </label>

                  {formData.isSpecial && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="mt-1 block w-32 shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      />
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                      checked={formData.recommended}
                      onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Recommended</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>

                {/* Nutritional Information */}
                <div className="col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Nutritional Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Calories</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Protein (g)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Carbs (g)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fat (g)</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.fat}
                    onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                  />
                </div>

                {/* Allergens */}
                <div className="col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                      value={newAllergen}
                      onChange={(e) => setNewAllergen(e.target.value)}
                      placeholder="Add allergen..."
                    />
                    <button
                      type="button"
                      onClick={addAllergen}
                      className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                      >
                        {allergen}
                        <button
                          type="button"
                          onClick={() => removeAllergen(allergen)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <Icon name="x" className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dietary Tags */}
                <div className="col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                      value={newDietaryTag}
                      onChange={(e) => setNewDietaryTag(e.target.value)}
                      placeholder="Add dietary tag..."
                    />
                    <button
                      type="button"
                      onClick={addDietaryTag}
                      className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.dietary.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeDietaryTag(tag)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <Icon name="x" className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="x" className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Customizations */}
                <div className="col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customizations</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Add customization options for customers (e.g., Size: Small, Medium, Large)
                  </p>
                  <textarea
                    className="w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    rows={4}
                    value={JSON.stringify(formData.customizations, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({ ...formData, customizations: parsed });
                      } catch (err) {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder='{"Size": ["Small", "Medium", "Large"], "Spice Level": ["Mild", "Medium", "Spicy"]}'
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Order Details Modal
const OrderDetailsModal = ({ order, onClose }) => {
  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order #{order.orderNumber || order._id.slice(-6)}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <Icon name="x" className="lucide-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Table</p>
                  <p className="font-medium">Table {order.tableNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium capitalize">{order.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Type</p>
                  <p className="font-medium capitalize">{order.orderType || 'Dine-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{formatDateTime(order.createdAt)}</p>
                </div>
                {order.customerName && (
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                )}
                {order.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.customizations && Object.entries(item.customizations).map(([key, value]) => (
                                <p key={key} className="text-xs text-gray-500">{key}: {value}</p>
                              ))}
                              {item.specialRequests && (
                                <p className="text-xs text-gray-500 italic">{item.specialRequests}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Subtotal</span>
                  <span className="text-sm">{formatCurrency(order.subtotal || order.total)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Tax</span>
                    <span className="text-sm">{formatCurrency(order.tax)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Discount</span>
                    <span className="text-sm text-red-600">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>

              {order.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Modal
const UserModal = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'waiter',
    phone: user?.phone || '',
    isActive: user?.isActive ?? true,
    permissions: user?.permissions || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {user ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {user && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!user}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="chef">Chef</option>
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Advanced Search Component
const AdvancedSearch = ({ onSearch, onClose }) => {
  const [searchParams, setSearchParams] = useState({
    name: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    available: '',
    inStock: '',
    isSpecial: ''
  });

  const handleSearch = () => {
    onSearch(searchParams);
    onClose();
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Search</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                  value={searchParams.name}
                  onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                  value={searchParams.category}
                  onChange={(e) => setSearchParams({ ...searchParams, category: e.target.value })}
                >
                  <option value="">All Categories</option>
                  <option value="appetizers">Appetizers</option>
                  <option value="mains">Main Courses</option>
                  <option value="desserts">Desserts</option>
                  <option value="beverages">Beverages</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Price</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={searchParams.minPrice}
                    onChange={(e) => setSearchParams({ ...searchParams, minPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Price</label>
                  <input
                    type="number"
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={searchParams.maxPrice}
                    onChange={(e) => setSearchParams({ ...searchParams, maxPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Available</label>
                  <select
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={searchParams.available}
                    onChange={(e) => setSearchParams({ ...searchParams, available: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">In Stock</label>
                  <select
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={searchParams.inStock}
                    onChange={(e) => setSearchParams({ ...searchParams, inStock: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special</label>
                  <select
                    className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    value={searchParams.isSpecial}
                    onChange={(e) => setSearchParams({ ...searchParams, isSpecial: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSearch}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Search
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Generator Component
const ReportGenerator = ({ type, data, onClose }) => {
  const generateReport = () => {
    const reportWindow = window.open('', '_blank');
    let reportContent = '';

    switch (type) {
      case 'sales':
        reportContent = generateSalesReport(data);
        break;
      case 'inventory':
        reportContent = generateInventoryReport(data);
        break;
      case 'staff':
        reportContent = generateStaffReport(data);
        break;
      default:
        reportContent = '<h1>Report not available</h1>';
    }

    reportWindow.document.write(reportContent);
    reportWindow.document.close();

    setTimeout(() => {
      reportWindow.print();
    }, 250);
  };

  const generateSalesReport = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin-top: 20px; }
          .summary-item { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="summary-item"><strong>Total Orders:</strong> ${data.totalOrders}</div>
          <div class="summary-item"><strong>Total Revenue:</strong> ${formatCurrency(data.totalRevenue)}</div>
          <div class="summary-item"><strong>Average Order Value:</strong> ${formatCurrency(data.avgOrderValue)}</div>
        </div>
        
        <h2>Top Selling Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${data.topItems.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const generateInventoryReport = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .low-stock { color: red; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <h2>Low Stock Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Current Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.lowStock.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.currentStock}</td>
                <td>${item.minStock}</td>
                <td class="low-stock">Reorder Required</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const generateStaffReport = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Staff Performance Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Staff Performance Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Orders Handled</th>
              <th>Revenue Generated</th>
              <th>Avg. Order Time</th>
            </tr>
          </thead>
          <tbody>
            ${data.staff.map(member => `
              <tr>
                <td>${member.name}</td>
                <td>${member.role}</td>
                <td>${member.ordersHandled}</td>
                <td>${formatCurrency(member.revenue)}</td>
                <td>${member.avgOrderTime} mins</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Report</h3>

            <div className="space-y-4">
              <p>Choose export format:</p>

              <button
                onClick={generateReport}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span>Print Report</span>
                <Icon name="printer" className="lucide-sm" />
              </button>

              <button
                onClick={() => exportToCSV(data.rawData, `${type}-report.csv`)}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span>Export as CSV</span>
                <Icon name="file-text" className="lucide-sm" />
              </button>

              <button
                onClick={() => handleExportData()}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span>Export as JSON</span>
                <Icon name="file-json" className="lucide-sm" />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the render to use ErrorBoundary
ReactDOM.render(
  <ErrorBoundary>
    <AdminPanel />
  </ErrorBoundary>,
  document.getElementById('root')
);