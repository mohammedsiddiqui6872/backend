import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Box, 
  FormHelperText,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  CircularProgress
 } from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  createTeamMemberSchema, 
  updateTeamMemberSchema, 
  type CreateTeamMember, 
  type UpdateTeamMember 
} from '../../schemas/teamSchemas';
import { teamAPI } from '../../services/api';

interface TeamMemberFormProps {
  initialData?: UpdateTeamMember;
  onSubmit: (data: CreateTeamMember | UpdateTeamMember) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  isLoading?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Default roles (fallback if custom roles fail to load)
const defaultRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'line_cook', label: 'Line Cook' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'host', label: 'Host' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'cleaner', label: 'Cleaner' }
];

const departments = [
  'Kitchen',
  'Service',
  'Management',
  'Bar',
  'Reception',
  'Housekeeping',
  'Maintenance'
];

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEdit = false,
  isLoading = false
}) => {
  const [tabValue, setTabValue] = React.useState(0);
  const [roles, setRoles] = useState(defaultRoles);
  const [rolesLoading, setRolesLoading] = useState(true);
  
  // Fetch custom roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await teamAPI.getRoles();
        console.log('Fetched roles:', response.data); // Debug log
        
        if (response.data && response.data.length > 0) {
          // Filter out only custom roles (non-system roles)
          const customRoles = response.data
            .filter((role: any) => !role.isSystem)
            .map((role: any) => ({
              value: role.code.toLowerCase(),
              label: role.name
            }));
          
          console.log('Custom roles:', customRoles); // Debug log
          
          // Combine default and custom roles
          const allRoles = [...defaultRoles, ...customRoles];
          
          // Remove duplicates based on value
          const uniqueRoles = allRoles.filter((role, index, self) =>
            index === self.findIndex((r) => r.value === role.value)
          );
          
          setRoles(uniqueRoles);
        } else {
          // Even if no custom roles, use default roles
          setRoles(defaultRoles);
        }
      } catch (error) {
        console.error('Failed to fetch custom roles:', error);
        // Keep default roles on error
      } finally {
        setRolesLoading(false);
      }
    };
    
    fetchRoles();
  }, []);
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: zodResolver(isEdit ? updateTeamMemberSchema : createTeamMemberSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      password: '',
      role: 'waiter',
      phone: '',
      isActive: true,
      profile: {
        dateOfBirth: '',
        gender: undefined,
        nationality: '',
        address: {},
        emergencyContact: {},
        employeeId: '',
        department: '',
        position: '',
        joiningDate: '',
        salary: {
          amount: 0,
          currency: 'AED',
          type: 'monthly'
        },
        bankDetails: {},
        documents: []
      }
    }
  });

  const handleFormSubmit = async (data: CreateTeamMember | UpdateTeamMember) => {
    await onSubmit(data);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Personal Info" />
              <Tab label="Employment" />
              <Tab label="Contact" />
              <Tab label="Financial" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      required
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      required
                    />
                  )}
                />
              </Box>

              {!isEdit && (
                <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Password"
                        type="password"
                        fullWidth
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        required
                      />
                    )}
                  />
                </Box>
              )}

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Date of Birth"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date?.toISOString())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.profile?.dateOfBirth,
                          helperText: errors.profile?.dateOfBirth?.message
                        }
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.gender"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.profile?.gender}>
                      <InputLabel>Gender</InputLabel>
                      <Select {...field} label="Gender">
                        <MenuItem value="">Select Gender</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                      {errors.profile?.gender && (
                        <FormHelperText>{errors.profile.gender.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.nationality"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nationality"
                      fullWidth
                      error={!!errors.profile?.nationality}
                      helperText={errors.profile?.nationality?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          color="primary"
                        />
                      }
                      label="Active Employee"
                    />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role} required>
                      <InputLabel>Role</InputLabel>
                      <Select 
                        {...field} 
                        label="Role"
                        disabled={rolesLoading}
                        endAdornment={rolesLoading && <CircularProgress size={20} />}
                      >
                        {roles.map(role => (
                          <MenuItem key={role.value} value={role.value}>
                            {role.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.role && (
                        <FormHelperText>{errors.role.message}</FormHelperText>
                      )}
                      {rolesLoading && (
                        <FormHelperText>Loading custom roles...</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.employeeId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Employee ID"
                      fullWidth
                      error={!!errors.profile?.employeeId}
                      helperText={errors.profile?.employeeId?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.department"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select {...field} label="Department">
                        <MenuItem value="">Select Department</MenuItem>
                        {departments.map(dept => (
                          <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.position"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Position"
                      fullWidth
                      error={!!errors.profile?.position}
                      helperText={errors.profile?.position?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.joiningDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Joining Date"
                      value={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date?.toISOString())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.profile?.joiningDate,
                          helperText: errors.profile?.joiningDate?.message
                        }
                      }}
                    />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Box sx={{ mb: 2 }}>
                  <strong>Address Information</strong>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Controller
                  name="profile.address.street"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Street Address"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.address.city"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="City" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.address.state"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="State/Emirate" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.address.country"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Country" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.address.postalCode"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Postal Code" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Box sx={{ mb: 2, mt: 3 }}>
                  <strong>Emergency Contact</strong>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.emergencyContact.name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Contact Name" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.emergencyContact.relationship"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Relationship" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.emergencyContact.phone"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Contact Phone" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.emergencyContact.email"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Contact Email" type="email" fullWidth />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Box sx={{ mb: 2 }}>
                  <strong>Salary Information</strong>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 31%' } }}>
                <Controller
                  name="profile.salary.type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Salary Type</InputLabel>
                      <Select {...field} label="Salary Type">
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="hourly">Hourly</MenuItem>
                        <MenuItem value="daily">Daily</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 31%' } }}>
                <Controller
                  name="profile.salary.amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount"
                      type="number"
                      fullWidth
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 31%' } }}>
                <Controller
                  name="profile.salary.currency"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select {...field} label="Currency">
                        <MenuItem value="AED">AED</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Box sx={{ mb: 2, mt: 3 }}>
                  <strong>Bank Details</strong>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.bankDetails.accountName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Account Name" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.bankDetails.accountNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Account Number" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.bankDetails.bankName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Bank Name" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }}>
                <Controller
                  name="profile.bankDetails.iban"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="IBAN" fullWidth />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>
        </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (isEdit ? 'Update' : 'Create')} Team Member
          </Button>
        </Box>
      </form>
    </LocalizationProvider>
  );
};