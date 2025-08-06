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
  InputAdornment,
  Button,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format } from 'date-fns';

const StockMovements: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalMovements, setTotalMovements] = useState(0);
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const movementTypes = [
    'PURCHASE',
    'SALE',
    'TRANSFER',
    'ADJUSTMENT',
    'PRODUCTION',
    'WASTE',
    'RETURN_SUPPLIER',
    'RETURN_CUSTOMER',
    'CYCLE_COUNT',
    'DAMAGE',
    'THEFT',
    'EXPIRED'
  ];

  useEffect(() => {
    fetchMovements();
  }, [page, rowsPerPage, type, startDate, endDate, inventoryItemId]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };
      
      if (type) params.type = type;
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
      if (inventoryItemId) params.inventoryItemId = inventoryItemId;
      
      const response = await axios.get('/api/admin/inventory/movements', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setMovements(response.data.data.movements || []);
      setTotalMovements(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching movements:', error);
      enqueueSnackbar('Failed to load stock movements', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMovement = async (movementId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/inventory/movements/${movementId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      enqueueSnackbar('Movement approved successfully', { variant: 'success' });
      fetchMovements();
    } catch (error) {
      enqueueSnackbar('Failed to approve movement', { variant: 'error' });
    }
  };

  const getMovementTypeChip = (type: string) => {
    const colors: any = {
      PURCHASE: 'success',
      SALE: 'primary',
      TRANSFER: 'info',
      ADJUSTMENT: 'warning',
      WASTE: 'error',
      CYCLE_COUNT: 'default'
    };
    
    return (
      <Chip
        label={type.replace('_', ' ')}
        color={colors[type] || 'default'}
        size="small"
      />
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && movements.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Filters */}
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              label="Type"
            >
              <MenuItem value="">All</MenuItem>
              {movementTypes.map(t => (
                <MenuItem key={t} value={t}>
                  {t.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { size: 'medium' } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            slotProps={{ textField: { size: 'medium' } }}
          />
          <TextField
            placeholder="Item ID"
            value={inventoryItemId}
            onChange={(e) => setInventoryItemId(e.target.value)}
            sx={{ width: 200 }}
          />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {/* Export logic */}}
          >
            Export
          </Button>
        </Stack>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>From/To</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement._id} hover>
                  <TableCell>
                    {format(new Date(movement.performedDate), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{getMovementTypeChip(movement.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {movement.itemName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {movement.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={movement.quantity > 0 ? 'success.main' : 'error.main'}
                    >
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.unit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {movement.fromLocation && (
                      <Typography variant="body2">
                        From: {movement.fromLocation.location}
                      </Typography>
                    )}
                    {movement.toLocation && (
                      <Typography variant="body2">
                        To: {movement.toLocation.location}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {movement.unitCost ? formatCurrency(movement.unitCost) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {movement.totalCost ? formatCurrency(movement.totalCost) : '-'}
                  </TableCell>
                  <TableCell>
                    {movement.reference && (
                      <Typography variant="body2">
                        {movement.reference.type}: {movement.reference.number}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {movement.performedBy?.name || 'System'}
                  </TableCell>
                  <TableCell>
                    {movement.requiresApproval && (
                      <Chip
                        label={movement.approvalStatus}
                        color={movement.approvalStatus === 'APPROVED' ? 'success' : 'warning'}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {movement.requiresApproval && movement.approvalStatus === 'PENDING' && (
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveMovement(movement._id)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton size="small" color="error">
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
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
          count={totalMovements}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default StockMovements;