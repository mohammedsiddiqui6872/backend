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
  Tooltip,
  Rating,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const supplierStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING'];
  const supplierCategories = [
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
    fetchSuppliers();
  }, [page, rowsPerPage, search, status, category]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };
      
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      
      const response = await axios.get('/api/admin/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setSuppliers(response.data.data.suppliers || []);
      setTotalSuppliers(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      enqueueSnackbar('Failed to load suppliers', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const colors: any = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      BLOCKED: 'error',
      PENDING: 'warning'
    };
    
    return <Chip label={status} color={colors[status] || 'default'} size="small" />;
  };

  if (loading && suppliers.length === 0) {
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
        <Typography variant="h6">Suppliers</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Supplier
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          placeholder="Search suppliers..."
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
          <InputLabel>Status</InputLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
            <MenuItem value="">All</MenuItem>
            {supplierStatuses.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
            <MenuItem value="">All</MenuItem>
            {supplierCategories.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Contact Info</TableCell>
              <TableCell>Categories</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier._id} hover>
                <TableCell>{supplier.code}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {supplier.name}
                  </Typography>
                </TableCell>
                <TableCell>{supplier.contactPerson}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    {supplier.phone && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="caption">{supplier.phone}</Typography>
                      </Stack>
                    )}
                    {supplier.email && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="caption">{supplier.email}</Typography>
                      </Stack>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {supplier.categories?.slice(0, 2).map((cat: string) => (
                      <Chip key={cat} label={cat} size="small" variant="outlined" />
                    ))}
                    {supplier.categories?.length > 2 && (
                      <Chip label={`+${supplier.categories.length - 2}`} size="small" variant="outlined" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Rating value={supplier.rating || 0} readOnly size="small" />
                </TableCell>
                <TableCell>{getStatusChip(supplier.status)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit">
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
        count={totalSuppliers}
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

export default Suppliers;