import React, { useState, useEffect } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
  LocalShipping as ShippingIcon,
  Store as StoreIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// Import components
import InventoryList from '../components/Inventory/InventoryList';
import StockMovements from '../components/Inventory/StockMovements';
import PurchaseOrders from '../components/Inventory/PurchaseOrders';
import Suppliers from '../components/Inventory/Suppliers';
import InventoryReports from '../components/Inventory/InventoryReports';
import AddEditInventoryItem from '../components/Inventory/AddEditInventoryItem';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  expiringItems: number;
  pendingOrders: number;
  activeSuppliers: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    expiringItems: 0,
    pendingOrders: 0,
    activeSuppliers: 0
  });
  const [loading, setLoading] = useState(true);
  const [openAddItem, setOpenAddItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch inventory stats
      const [inventoryRes, ordersRes, suppliersRes] = await Promise.all([
        axios.get('/api/admin/inventory/reports/valuation', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/purchase-orders/summary/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/suppliers', {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'ACTIVE', limit: 1 }
        })
      ]);

      // Fetch low stock and expiring items
      const [lowStockRes, expiringRes] = await Promise.all([
        axios.get('/api/admin/inventory', {
          headers: { Authorization: `Bearer ${token}` },
          params: { lowStock: true, limit: 1 }
        }),
        axios.get('/api/admin/inventory/reports/expiring', {
          headers: { Authorization: `Bearer ${token}` },
          params: { days: 7 }
        })
      ]);

      setStats({
        totalItems: inventoryRes.data.data.itemCount || 0,
        totalValue: inventoryRes.data.data.totalValue || 0,
        lowStockItems: lowStockRes.data.data.pagination?.total || 0,
        expiringItems: expiringRes.data.data?.length || 0,
        pendingOrders: ordersRes.data.data.summary?.pendingApprovals || 0,
        activeSuppliers: suppliersRes.data.data.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      enqueueSnackbar('Failed to load inventory statistics', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch critical alerts
      const [lowStockRes, expiringRes] = await Promise.all([
        axios.get('/api/admin/inventory', {
          headers: { Authorization: `Bearer ${token}` },
          params: { lowStock: true, limit: 5 }
        }),
        axios.get('/api/admin/inventory/reports/expiring', {
          headers: { Authorization: `Bearer ${token}` },
          params: { days: 3 }
        })
      ]);

      const alertsList = [];
      
      // Add low stock alerts
      if (lowStockRes.data.data.items?.length > 0) {
        lowStockRes.data.data.items.forEach((item: any) => {
          alertsList.push({
            type: 'warning',
            message: `${item.name} is low on stock (${item.totalAvailable} remaining)`,
            action: 'Reorder'
          });
        });
      }

      // Add expiring alerts
      if (expiringRes.data.data?.length > 0) {
        expiringRes.data.data.forEach((item: any) => {
          if (item.daysUntilExpiry <= 0) {
            alertsList.push({
              type: 'error',
              message: `${item.item.name} (Batch: ${item.batch}) has expired`,
              action: 'Dispose'
            });
          } else {
            alertsList.push({
              type: 'warning',
              message: `${item.item.name} expires in ${item.daysUntilExpiry} days`,
              action: 'Use Soon'
            });
          }
        });
      }

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setOpenAddItem(true);
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setOpenAddItem(true);
  };

  const handleCloseAddItem = () => {
    setOpenAddItem(false);
    setSelectedItem(null);
  };

  const handleItemSaved = () => {
    handleCloseAddItem();
    fetchStats();
    if (activeTab === 0) {
      // Refresh inventory list
      window.location.reload(); // Simple refresh for now
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/inventory/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      enqueueSnackbar('Inventory exported successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to export inventory', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon fontSize="large" />
          Inventory Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchStats} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Badge badgeContent={alerts.length} color="error">
            <Tooltip title="Alerts">
              <IconButton>
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
          </Badge>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
          >
            Add Item
          </Button>
        </Stack>
      </Stack>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Stack spacing={1} mb={3}>
          {alerts.slice(0, 3).map((alert, index) => (
            <Alert 
              key={index} 
              severity={alert.type}
              action={
                <Button size="small" color="inherit">
                  {alert.action}
                </Button>
              }
            >
              {alert.message}
            </Alert>
          ))}
        </Stack>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Total Items
                </Typography>
                <Typography variant="h4">
                  {stats.totalItems.toLocaleString()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Total Value
                </Typography>
                <Typography variant="h4">
                  ${stats.totalValue.toLocaleString()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Low Stock
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4" color="warning.main">
                    {stats.lowStockItems}
                  </Typography>
                  <WarningIcon color="warning" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Expiring Soon
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4" color="error.main">
                    {stats.expiringItems}
                  </Typography>
                  <WarningIcon color="error" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Pending Orders
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4">
                    {stats.pendingOrders}
                  </Typography>
                  <ShippingIcon color="action" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Active Suppliers
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4">
                    {stats.activeSuppliers}
                  </Typography>
                  <StoreIcon color="action" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="inventory tabs">
            <Tab 
              icon={<InventoryIcon />} 
              iconPosition="start" 
              label="Inventory Items" 
            />
            <Tab 
              icon={<ShippingIcon />} 
              iconPosition="start" 
              label="Stock Movements" 
            />
            <Tab 
              icon={<ShippingIcon />} 
              iconPosition="start" 
              label="Purchase Orders" 
            />
            <Tab 
              icon={<StoreIcon />} 
              iconPosition="start" 
              label="Suppliers" 
            />
            <Tab 
              icon={<AssessmentIcon />} 
              iconPosition="start" 
              label="Reports" 
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <InventoryList onEdit={handleEditItem} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <StockMovements />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <PurchaseOrders />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <Suppliers />
        </TabPanel>
        <TabPanel value={activeTab} index={4}>
          <InventoryReports />
        </TabPanel>
      </Paper>

      {/* Add/Edit Item Dialog */}
      <AddEditInventoryItem
        open={openAddItem}
        onClose={handleCloseAddItem}
        item={selectedItem}
        onSaved={handleItemSaved}
      />
    </Box>
  );
};

export default Inventory;