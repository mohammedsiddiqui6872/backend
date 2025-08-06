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
  IconButton,
  Tooltip,
  Typography,
  InputAdornment,
  Button,
  Menu,
  CircularProgress,
  Collapse,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  LocalShipping as ShippingIcon,
  QrCode as QrCodeIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

interface InventoryListProps {
  onEdit: (item: any) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ onEdit }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { enqueueSnackbar } = useSnackbar();

  const categories = [
    'produce',
    'meat',
    'seafood',
    'dairy',
    'dry-goods',
    'beverages',
    'supplies',
    'packaging'
  ];

  useEffect(() => {
    fetchItems();
  }, [page, rowsPerPage, search, category, lowStockOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };
      
      if (search) params.search = search;
      if (category) params.category = category;
      if (lowStockOnly) params.lowStock = true;
      
      const response = await axios.get('/api/admin/inventory', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setItems(response.data.data.items || []);
      setTotalItems(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      enqueueSnackbar('Failed to load inventory items', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleToggleExpand = (itemId: string) => {
    setExpandedRows(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/inventory/${selectedItem._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      enqueueSnackbar('Item deleted successfully', { variant: 'success' });
      fetchItems();
    } catch (error) {
      enqueueSnackbar('Failed to delete item', { variant: 'error' });
    }
    
    handleMenuClose();
  };

  const handleReceiveStock = () => {
    // Navigate to receive stock form
    handleMenuClose();
  };

  const handleTransferStock = () => {
    // Navigate to transfer stock form
    handleMenuClose();
  };

  const getStockStatusChip = (item: any) => {
    const percentage = (item.totalAvailable / item.reorderPoint) * 100;
    
    if (percentage <= 25) {
      return <Chip label="Critical" color="error" size="small" />;
    } else if (percentage <= 50) {
      return <Chip label="Low" color="warning" size="small" />;
    } else if (percentage <= 100) {
      return <Chip label="Reorder" color="info" size="small" />;
    } else {
      return <Chip label="In Stock" color="success" size="small" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && items.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          placeholder="Search by name, SKU, or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            label="Category"
          >
            <MenuItem value="">All</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant={lowStockOnly ? 'contained' : 'outlined'}
          onClick={() => setLowStockOnly(!lowStockOnly)}
          startIcon={<WarningIcon />}
        >
          Low Stock Only
        </Button>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <React.Fragment key={item._id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleExpand(item._id)}
                    >
                      {expandedRows.includes(item._id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {item.barcode && (
                        <Tooltip title={`Barcode: ${item.barcode}`}>
                          <QrCodeIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                      <Typography variant="body2">{item.sku}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.name}
                    </Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.category.replace('-', ' ')} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {item.totalQuantity} {item.baseUnit}
                  </TableCell>
                  <TableCell align="right">
                    {item.totalAvailable} {item.baseUnit}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(item.currentCost)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(item.totalQuantity * item.currentCost)}
                  </TableCell>
                  <TableCell>
                    {getStockStatusChip(item)}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, item)}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                    <Collapse in={expandedRows.includes(item._id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" gutterBottom>
                              Stock Levels
                            </Typography>
                            <Stack spacing={1}>
                              <Typography variant="body2">
                                Reorder Point: {item.reorderPoint} {item.baseUnit}
                              </Typography>
                              <Typography variant="body2">
                                Reorder Quantity: {item.reorderQuantity} {item.baseUnit}
                              </Typography>
                              {item.safetyStock && (
                                <Typography variant="body2">
                                  Safety Stock: {item.safetyStock} {item.baseUnit}
                                </Typography>
                              )}
                            </Stack>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" gutterBottom>
                              Suppliers
                            </Typography>
                            <Stack spacing={1}>
                              {item.suppliers?.map((supplier: any, index: number) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2">
                                    {supplier.supplier?.name || 'Unknown'}
                                  </Typography>
                                  {supplier.preferredSupplier && (
                                    <Chip label="Preferred" size="small" color="primary" />
                                  )}
                                </Stack>
                              ))}
                            </Stack>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" gutterBottom>
                              Location & Storage
                            </Typography>
                            <Stack spacing={1}>
                              {item.stockLevels?.map((level: any, index: number) => (
                                <Typography key={index} variant="body2">
                                  {level.location}: {level.quantity} {item.baseUnit}
                                </Typography>
                              ))}
                              {item.storageConditions && (
                                <Typography variant="body2">
                                  Storage: {item.storageConditions}
                                </Typography>
                              )}
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalItems}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleReceiveStock}>
          <ShippingIcon fontSize="small" sx={{ mr: 1 }} />
          Receive Stock
        </MenuItem>
        <MenuItem onClick={handleTransferStock}>
          Transfer Stock
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          // Handle cycle count
        }}>
          Cycle Count
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          // Handle waste recording
        }}>
          Record Waste
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Item
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default InventoryList;