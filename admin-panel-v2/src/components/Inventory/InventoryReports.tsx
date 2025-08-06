import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format } from 'date-fns';

const InventoryReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState<any>(null);
  const [abcAnalysis, setAbcAnalysis] = useState<any>(null);
  const [turnoverAnalysis, setTurnoverAnalysis] = useState<any[]>([]);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [valuationRes, abcRes, turnoverRes, expiringRes] = await Promise.all([
        axios.get('/api/admin/inventory/reports/valuation', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/inventory/reports/abc-analysis', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/inventory/reports/turnover', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/inventory/reports/expiring', {
          headers: { Authorization: `Bearer ${token}` },
          params: { days: 30 }
        })
      ]);
      
      setValuation(valuationRes.data.data);
      setAbcAnalysis(abcRes.data.data);
      setTurnoverAnalysis(turnoverRes.data.data || []);
      setExpiringItems(expiringRes.data.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      enqueueSnackbar('Failed to load reports', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTurnoverStatus = (daysOnHand: number) => {
    if (daysOnHand > 90) return { label: 'Slow', color: 'error' };
    if (daysOnHand > 30) return { label: 'Normal', color: 'default' };
    if (daysOnHand > 7) return { label: 'Fast', color: 'success' };
    return { label: 'Very Fast', color: 'primary' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Total Inventory Value
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(valuation?.totalValue || 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {valuation?.itemCount || 0} items in stock
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  ABC Analysis
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    A Items: {abcAnalysis?.summary?.A?.count || 0} ({abcAnalysis?.summary?.A?.percentage?.toFixed(1) || 0}%)
                  </Typography>
                  <Typography variant="body2">
                    B Items: {abcAnalysis?.summary?.B?.count || 0} ({abcAnalysis?.summary?.B?.percentage?.toFixed(1) || 0}%)
                  </Typography>
                  <Typography variant="body2">
                    C Items: {abcAnalysis?.summary?.C?.count || 0} ({abcAnalysis?.summary?.C?.percentage?.toFixed(1) || 0}%)
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Expiring Soon
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4" color="warning.main">
                    {expiringItems.length}
                  </Typography>
                  <WarningIcon color="warning" />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Within next 30 days
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="subtitle2">
                  Actions
                </Typography>
                <Stack spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    fullWidth
                  >
                    Export Report
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    fullWidth
                  >
                    Full Analysis
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Value by Category */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Inventory Value by Category
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(valuation?.byCategory || {}).map(([category, value]: [string, any]) => (
            <Grid item xs={12} sm={6} md={3} key={category}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(value)}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Stock Turnover Analysis */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Stock Turnover Analysis
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Stock Value</TableCell>
                <TableCell align="right">Turnover Rate</TableCell>
                <TableCell align="right">Days on Hand</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turnoverAnalysis.slice(0, 10).map((item: any) => {
                const status = getTurnoverStatus(item.daysOnHand);
                return (
                  <TableRow key={item.item.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.item.category}</TableCell>
                    <TableCell align="right">{item.currentStock}</TableCell>
                    <TableCell align="right">{formatCurrency(item.stockValue)}</TableCell>
                    <TableCell align="right">{item.turnoverRate}x</TableCell>
                    <TableCell align="right">{item.daysOnHand}</TableCell>
                    <TableCell>
                      <Chip 
                        label={status.label} 
                        color={status.color as any} 
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Expiring Items */}
      {expiringItems.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Items Expiring Soon
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Days Until Expiry</TableCell>
                  <TableCell align="right">Value at Risk</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiringItems.slice(0, 10).map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.item.name}</TableCell>
                    <TableCell>{item.batch}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>
                      {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${item.daysUntilExpiry} days`}
                        color={item.daysUntilExpiry <= 3 ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default InventoryReports;