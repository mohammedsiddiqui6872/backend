import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format } from 'date-fns';

const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalOrders, setTotalOrders] = useState(0);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const orderStatuses = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'SENT',
    'PARTIAL_RECEIVED',
    'RECEIVED',
    'COMPLETED',
    'CANCELLED'
  ];

  const paymentStatuses = ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'];

  useEffect(() => {
    fetchOrders();
  }, [page, rowsPerPage, status, paymentStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };
      
      if (status) params.status = status;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      
      const response = await axios.get('/api/admin/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setOrders(response.data.data.orders || []);
      setTotalOrders(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
      enqueueSnackbar('Failed to load purchase orders', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const colors: any = {
      DRAFT: 'default',
      PENDING_APPROVAL: 'warning',
      APPROVED: 'info',
      SENT: 'primary',
      RECEIVED: 'success',
      COMPLETED: 'success',
      CANCELLED: 'error'
    };
    
    return <Chip label={status.replace('_', ' ')} color={colors[status] || 'default'} size="small" />;
  };

  const getPaymentStatusChip = (status: string) => {
    const colors: any = {
      UNPAID: 'default',
      PARTIAL: 'warning',
      PAID: 'success',
      OVERDUE: 'error'
    };
    
    return <Chip label={status} color={colors[status] || 'default'} size="small" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && orders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Purchase Orders</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          New Order
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
            <MenuItem value="">All</MenuItem>
            {orderStatuses.map(s => (
              <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Payment Status</InputLabel>
          <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} label="Payment Status">
            <MenuItem value="">All</MenuItem>
            {paymentStatuses.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id} hover>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>{format(new Date(order.orderDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{order.supplierName}</TableCell>
                <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                <TableCell>{getStatusChip(order.status)}</TableCell>
                <TableCell>{getPaymentStatusChip(order.paymentStatus)}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {order.status === 'APPROVED' && (
                      <Tooltip title="Send to Supplier">
                        <IconButton size="small" color="primary">
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalOrders}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default PurchaseOrders;