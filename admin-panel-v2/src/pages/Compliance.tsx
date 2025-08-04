import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Tabs, Tab, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress, Switch, FormControlLabel, Grid } from '@mui/material';


import {
  Shield,
  FileText,
  Download,
  Trash2,
  Edit,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';

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

const Compliance: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [legalDocuments, setLegalDocuments] = useState<any[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [gdprReport, setGdprReport] = useState<any>(null);
  const [dpas, setDpas] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: // Legal Documents
          const docsResponse = await api.get('/compliance/admin/legal');
          setLegalDocuments(docsResponse.data);
          break;
        case 1: // Data Retention
          const policiesResponse = await api.get('/compliance/admin/retention-policy');
          setRetentionPolicies(policiesResponse.data);
          break;
        case 2: // Audit Logs
          const logsResponse = await api.get('/compliance/audit-logs?limit=100');
          setAuditLogs(logsResponse.data.logs);
          break;
        case 3: // GDPR Report
          const endDate = new Date();
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          const reportResponse = await api.get('/compliance/gdpr/report', {
            params: { startDate, endDate }
          });
          setGdprReport(reportResponse.data);
          break;
        case 4: // DPAs
          const dpaResponse = await api.get('/compliance/admin/dpa');
          setDpas(dpaResponse.data);
          break;
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLegalDocument = async (document: any) => {
    try {
      await api.post('/compliance/admin/legal', document);
      fetchData();
      setOpenDialog(null);
    } catch (error) {
      console.error('Error saving legal document:', error);
    }
  };

  const handleSaveRetentionPolicy = async (policy: any) => {
    try {
      await api.post('/compliance/admin/retention-policy', policy);
      fetchData();
      setOpenDialog(null);
    } catch (error) {
      console.error('Error saving retention policy:', error);
    }
  };

  const handleApplyRetentionPolicies = async () => {
    if (window.confirm('Are you sure you want to apply all retention policies now?')) {
      try {
        await api.post('/compliance/admin/retention-policy/apply');
        alert('Retention policies applied successfully');
        fetchData();
      } catch (error) {
        console.error('Error applying retention policies:', error);
      }
    }
  };

  const exportGdprData = async (userId: string) => {
    try {
      const response = await api.post('/compliance/gdpr/export', {
        userId,
        format: 'zip'
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gdpr_export_${userId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting GDPR data:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield />
          Compliance & Legal
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Legal Documents" />
            <Tab label="Data Retention" />
            <Tab label="Audit Logs" />
            <Tab label="GDPR Dashboard" />
            <Tab label="Data Processing Agreements" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Legal Documents</Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus />}
                  onClick={() => {
                    setSelectedItem(null);
                    setOpenDialog('legal');
                  }}
                >
                  Add Document
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Effective Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {legalDocuments.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell>
                          <Chip 
                            label={doc.type.replace('_', ' ')} 
                            size="small" 
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell>{doc.language.toUpperCase()}</TableCell>
                        <TableCell>
                          {new Date(doc.effectiveDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={doc.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={doc.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedItem(doc);
                              setOpenDialog('legal-view');
                            }}
                          >
                            <Eye size={16} />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedItem(doc);
                              setOpenDialog('legal');
                            }}
                          >
                            <Edit size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Data Retention Policies</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Clock />}
                    onClick={handleApplyRetentionPolicies}
                  >
                    Apply Policies Now
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Plus />}
                    onClick={() => {
                      setSelectedItem(null);
                      setOpenDialog('retention');
                    }}
                  >
                    Add Policy
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {retentionPolicies.map((policy) => (
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' } }} key={policy._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6">
                            {policy.dataType.replace('_', ' ')}
                          </Typography>
                          <Chip
                            label={policy.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={policy.isActive ? 'success' : 'default'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {policy.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <Chip
                            icon={<Clock size={16} />}
                            label={`${policy.retentionPeriod.value} ${policy.retentionPeriod.unit}`}
                            size="small"
                          />
                          <Chip
                            label={policy.actionOnExpiry}
                            size="small"
                            color="warning"
                          />
                        </Box>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Legal Basis: {policy.legalBasis.replace('_', ' ')}
                        </Typography>
                        {policy.lastExecuted && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Last Executed: {new Date(policy.lastExecuted).toLocaleString()}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Audit Logs
              </Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell>Success</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.userEmail || 'System'}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.category}
                            size="small"
                            color={log.category === 'security' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.risk.level}
                            size="small"
                            color={
                              log.risk.level === 'critical' ? 'error' :
                              log.risk.level === 'high' ? 'warning' :
                              'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <CheckCircle size={16} color="green" />
                          ) : (
                            <AlertTriangle size={16} color="red" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                GDPR Compliance Dashboard
              </Typography>

              {gdprReport && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 23%' } }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Data Subject Requests
                        </Typography>
                        <Typography variant="h4">
                          {gdprReport.metrics.dataSubjectRequests}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 23%' } }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Security Incidents
                        </Typography>
                        <Typography variant="h4" color={gdprReport.metrics.securityIncidents > 0 ? 'error' : 'inherit'}>
                          {gdprReport.metrics.securityIncidents}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 23%' } }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Consents Granted
                        </Typography>
                        <Typography variant="h4">
                          {gdprReport.metrics.consentStatistics.find((s: any) => s._id === 'granted')?.count || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 23%' } }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Records Processed
                        </Typography>
                        <Typography variant="h4">
                          {gdprReport.metrics.retentionPoliciesApplied.totalRecordsProcessed}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ flex: '1 1 100%' }}>
                    <Alert severity="info">
                      This report covers the period from{' '}
                      {new Date(gdprReport.period.startDate).toLocaleDateString()} to{' '}
                      {new Date(gdprReport.period.endDate).toLocaleDateString()}
                    </Alert>
                  </Box>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Data Processing Agreements</Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus />}
                  onClick={() => {
                    setSelectedItem(null);
                    setOpenDialog('dpa');
                  }}
                >
                  Add DPA
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {dpas.map((dpa) => (
                  <Box sx={{ flex: '1 1 100%', '@media (min-width: 900px)': { flex: '1 1 48%' }, '@media (min-width: 1200px)': { flex: '1 1 31%' } }} key={dpa._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" component="div">
                            {dpa.processorName}
                          </Typography>
                          <Chip
                            label={dpa.status}
                            size="small"
                            color={
                              dpa.status === 'active' ? 'success' :
                              dpa.status === 'expired' ? 'error' :
                              'default'
                            }
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Type: {dpa.processorType.replace('_', ' ')}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Agreement Date: {new Date(dpa.agreementDate).toLocaleDateString()}
                        </Typography>
                        
                        {dpa.expiryDate && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Expires: {new Date(dpa.expiryDate).toLocaleDateString()}
                          </Typography>
                        )}
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" display="block" gutterBottom>
                            Data Categories:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {dpa.dataCategories?.map((category: string, index: number) => (
                              <Chip
                                key={index}
                                label={category.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                        
                        {dpa.securityMeasures && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" display="block" gutterBottom>
                              Security Measures:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {Object.entries(dpa.securityMeasures).map(([key, value]) => {
                                if (typeof value === 'boolean' && value) {
                                  return (
                                    <Chip
                                      key={key}
                                      icon={<CheckCircle size={16} />}
                                      label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                                  );
                                }
                                return null;
                              })}
                            </Box>
                          </Box>
                        )}
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedItem(dpa);
                              setOpenDialog('dpa-view');
                            }}
                          >
                            <Eye size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedItem(dpa);
                              setOpenDialog('dpa');
                            }}
                          >
                            <Edit size={16} />
                          </IconButton>
                          {dpa.status === 'active' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to terminate this DPA?')) {
                                  // Handle termination
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </TabPanel>
          </>
        )}

        {/* Legal Document Dialog */}
        <Dialog 
          open={openDialog === 'legal'} 
          onClose={() => setOpenDialog(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedItem ? 'Edit Legal Document' : 'Add Legal Document'}
          </DialogTitle>
          <DialogContent>
            {/* Form fields for legal document */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={() => handleSaveLegalDocument({})}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Retention Policy Dialog */}
        <Dialog 
          open={openDialog === 'retention'} 
          onClose={() => setOpenDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedItem ? 'Edit Retention Policy' : 'Add Retention Policy'}
          </DialogTitle>
          <DialogContent>
            {/* Form fields for retention policy */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={() => handleSaveRetentionPolicy({})}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Compliance;