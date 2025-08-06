import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Divider,
  IconButton,
  Chip,
  Box,
  InputAdornment,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

interface AddEditInventoryItemProps {
  open: boolean;
  onClose: () => void;
  item: any | null;
  onSaved: () => void;
}

const AddEditInventoryItem: React.FC<AddEditInventoryItemProps> = ({
  open,
  onClose,
  item,
  onSaved
}) => {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'dry-goods',
    description: '',
    baseUnit: 'piece',
    currentCost: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    safetyStock: 0,
    economicOrderQuantity: 0,
    minimumOrderQuantity: 1,
    maximumStockLevel: 0,
    batchTracking: false,
    expiryTracking: false,
    temperatureControlled: false,
    storageConditions: '',
    shelfLife: 0,
    wastePercentage: 0,
    costingMethod: 'WEIGHTED_AVG',
    suppliers: [] as any[],
    preferredSupplierId: '',
    unitConversions: [] as any[],
    allergens: [] as string[],
    tags: [] as string[],
    isActive: true
  });

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

  const units = [
    'piece',
    'kg',
    'g',
    'l',
    'ml',
    'dozen',
    'case',
    'box',
    'bag',
    'can',
    'bottle',
    'pack'
  ];

  const costingMethods = [
    { value: 'FIFO', label: 'First In First Out (FIFO)' },
    { value: 'LIFO', label: 'Last In First Out (LIFO)' },
    { value: 'WEIGHTED_AVG', label: 'Weighted Average' },
    { value: 'SPECIFIC', label: 'Specific Identification' }
  ];

  const commonAllergens = [
    'Gluten',
    'Dairy',
    'Eggs',
    'Peanuts',
    'Tree Nuts',
    'Fish',
    'Shellfish',
    'Soy',
    'Sesame'
  ];

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      if (item) {
        setFormData({
          ...item,
          suppliers: item.suppliers || [],
          unitConversions: item.unitConversions || [],
          allergens: item.allergens || [],
          tags: item.tags || []
        });
      } else {
        resetForm();
      }
    }
  }, [open, item]);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'ACTIVE', limit: 100 }
      });
      setSuppliers(response.data.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category: 'dry-goods',
      description: '',
      baseUnit: 'piece',
      currentCost: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      safetyStock: 0,
      economicOrderQuantity: 0,
      minimumOrderQuantity: 1,
      maximumStockLevel: 0,
      batchTracking: false,
      expiryTracking: false,
      temperatureControlled: false,
      storageConditions: '',
      shelfLife: 0,
      wastePercentage: 0,
      costingMethod: 'WEIGHTED_AVG',
      suppliers: [],
      preferredSupplierId: '',
      unitConversions: [],
      allergens: [],
      tags: [],
      isActive: true
    });
  };

  const handleChange = (field: string) => (event: any) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSupplier = () => {
    setFormData(prev => ({
      ...prev,
      suppliers: [
        ...prev.suppliers,
        {
          supplier: '',
          supplierSKU: '',
          cost: 0,
          leadTimeDays: 0,
          moq: 1,
          preferredSupplier: prev.suppliers.length === 0
        }
      ]
    }));
  };

  const handleSupplierChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newSuppliers = [...prev.suppliers];
      newSuppliers[index] = { ...newSuppliers[index], [field]: value };
      
      // If setting as preferred, unset others
      if (field === 'preferredSupplier' && value) {
        newSuppliers.forEach((s, i) => {
          if (i !== index) s.preferredSupplier = false;
        });
      }
      
      return { ...prev, suppliers: newSuppliers };
    });
  };

  const handleRemoveSupplier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter((_, i) => i !== index)
    }));
  };

  const handleAddConversion = () => {
    setFormData(prev => ({
      ...prev,
      unitConversions: [
        ...prev.unitConversions,
        { fromUnit: '', toUnit: prev.baseUnit, factor: 1 }
      ]
    }));
  };

  const handleConversionChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newConversions = [...prev.unitConversions];
      newConversions[index] = { ...newConversions[index], [field]: value };
      return { ...prev, unitConversions: newConversions };
    });
  };

  const handleRemoveConversion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      unitConversions: prev.unitConversions.filter((_, i) => i !== index)
    }));
  };

  const handleAllergenToggle = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Validate required fields
      if (!formData.name || !formData.sku || !formData.category) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
        return;
      }
      
      // Prepare data
      const dataToSubmit = {
        ...formData,
        currentCost: parseFloat(formData.currentCost.toString()),
        reorderPoint: parseInt(formData.reorderPoint.toString()),
        reorderQuantity: parseInt(formData.reorderQuantity.toString()),
        safetyStock: parseInt(formData.safetyStock.toString()),
        economicOrderQuantity: parseInt(formData.economicOrderQuantity.toString()),
        minimumOrderQuantity: parseInt(formData.minimumOrderQuantity.toString()),
        maximumStockLevel: parseInt(formData.maximumStockLevel.toString()),
        shelfLife: parseInt(formData.shelfLife.toString()),
        wastePercentage: parseFloat(formData.wastePercentage.toString())
      };
      
      if (item) {
        // Update existing item
        await axios.put(`/api/admin/inventory/${item._id}`, dataToSubmit, {
          headers: { Authorization: `Bearer ${token}` }
        });
        enqueueSnackbar('Item updated successfully', { variant: 'success' });
      } else {
        // Create new item
        await axios.post('/api/admin/inventory', dataToSubmit, {
          headers: { Authorization: `Bearer ${token}` }
        });
        enqueueSnackbar('Item created successfully', { variant: 'success' });
      }
      
      onSaved();
    } catch (error: any) {
      console.error('Error saving item:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to save item',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {item ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  value={formData.sku}
                  onChange={handleChange('sku')}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Barcode"
                  value={formData.barcode}
                  onChange={handleChange('barcode')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={handleChange('category')}
                    label="Category"
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Units & Pricing */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Units & Pricing
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Base Unit</InputLabel>
                  <Select
                    value={formData.baseUnit}
                    onChange={handleChange('baseUnit')}
                    label="Base Unit"
                  >
                    {units.map(unit => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Current Cost"
                  type="number"
                  value={formData.currentCost}
                  onChange={handleChange('currentCost')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Costing Method</InputLabel>
                  <Select
                    value={formData.costingMethod}
                    onChange={handleChange('costingMethod')}
                    label="Costing Method"
                  >
                    {costingMethods.map(method => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Stock Levels */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Stock Levels
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Reorder Point"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={handleChange('reorderPoint')}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Reorder Quantity"
                  type="number"
                  value={formData.reorderQuantity}
                  onChange={handleChange('reorderQuantity')}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Safety Stock"
                  type="number"
                  value={formData.safetyStock}
                  onChange={handleChange('safetyStock')}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Max Stock Level"
                  type="number"
                  value={formData.maximumStockLevel}
                  onChange={handleChange('maximumStockLevel')}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Advanced Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.batchTracking}
                          onChange={handleChange('batchTracking')}
                        />
                      }
                      label="Batch Tracking"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.expiryTracking}
                          onChange={handleChange('expiryTracking')}
                        />
                      }
                      label="Expiry Tracking"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.temperatureControlled}
                          onChange={handleChange('temperatureControlled')}
                        />
                      }
                      label="Temperature Controlled"
                    />
                  </Grid>
                </Grid>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Storage Conditions"
                      value={formData.storageConditions}
                      onChange={handleChange('storageConditions')}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Shelf Life (days)"
                      type="number"
                      value={formData.shelfLife}
                      onChange={handleChange('shelfLife')}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Waste %"
                      type="number"
                      value={formData.wastePercentage}
                      onChange={handleChange('wastePercentage')}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Allergens */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Allergens
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {commonAllergens.map(allergen => (
                      <Chip
                        key={allergen}
                        label={allergen}
                        onClick={() => handleAllergenToggle(allergen)}
                        color={formData.allergens.includes(allergen) ? 'primary' : 'default'}
                        variant={formData.allergens.includes(allergen) ? 'filled' : 'outlined'}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Suppliers */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Suppliers</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {formData.suppliers.map((supplier, index) => (
                  <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Supplier</InputLabel>
                          <Select
                            value={supplier.supplier}
                            onChange={(e) => handleSupplierChange(index, 'supplier', e.target.value)}
                            label="Supplier"
                          >
                            {suppliers.map(s => (
                              <MenuItem key={s._id} value={s._id}>
                                {s.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Supplier SKU"
                          value={supplier.supplierSKU}
                          onChange={(e) => handleSupplierChange(index, 'supplierSKU', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Cost"
                          type="number"
                          value={supplier.cost}
                          onChange={(e) => handleSupplierChange(index, 'cost', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Lead Days"
                          type="number"
                          value={supplier.leadTimeDays}
                          onChange={(e) => handleSupplierChange(index, 'leadTimeDays', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={supplier.preferredSupplier}
                              onChange={(e) => handleSupplierChange(index, 'preferredSupplier', e.target.checked)}
                            />
                          }
                          label="Preferred"
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton onClick={() => handleRemoveSupplier(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddSupplier}
                >
                  Add Supplier
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Unit Conversions */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Unit Conversions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {formData.unitConversions.map((conversion, index) => (
                  <Stack key={index} direction="row" spacing={2} alignItems="center">
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>From Unit</InputLabel>
                      <Select
                        value={conversion.fromUnit}
                        onChange={(e) => handleConversionChange(index, 'fromUnit', e.target.value)}
                        label="From Unit"
                      >
                        {units.map(unit => (
                          <MenuItem key={unit} value={unit}>
                            {unit}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography>=</Typography>
                    <TextField
                      label="Factor"
                      type="number"
                      value={conversion.factor}
                      onChange={(e) => handleConversionChange(index, 'factor', e.target.value)}
                      sx={{ width: 100 }}
                    />
                    <Typography>{formData.baseUnit}</Typography>
                    <IconButton onClick={() => handleRemoveConversion(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddConversion}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Conversion
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : item ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditInventoryItem;