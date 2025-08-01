import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface ImportResult {
  success: boolean;
  preview?: any[];
  errors?: any[];
  warnings?: any[];
  summary?: {
    total: number;
    successful?: number;
    failed?: number;
    duplicates?: number;
    created?: number;
    updated?: number;
    skipped?: number;
  };
  results?: {
    created: any[];
    updated: any[];
    skipped: any[];
    errors: any[];
  };
}

interface TableImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

const TableImport: React.FC<TableImportProps> = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'skip' | 'update' | 'replace'>('skip');
  const [updatePositions, setUpdatePositions] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setPreviewResult(null);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/admin/tables/import/sample', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tables-sample.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Sample CSV downloaded');
    } catch (error) {
      toast.error('Failed to download sample CSV');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setPreviewing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/admin/tables/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPreviewResult(response.data);
      
      if (!response.data.success && response.data.errors?.length > 0) {
        toast.error('CSV contains errors. Please fix them before importing.');
      } else if (response.data.warnings?.length > 0) {
        toast('CSV contains warnings. Review before importing.', {
          icon: '⚠️',
        });
      } else {
        toast.success('CSV validated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to preview CSV');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !previewResult?.success) {
      toast.error('Please preview the file first');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', importMode);
    formData.append('updatePositions', updatePositions.toString());

    try {
      const response = await api.post('/admin/tables/import/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const { summary } = response.data;
        toast.success(
          `Import completed: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`
        );
        onImportComplete();
      } else {
        toast.error('Import failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import tables');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Import Tables from CSV</h2>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-2">CSV Format Requirements:</h3>
          <ul className="text-sm space-y-1">
            <li>• Required columns: <code>number</code>, <code>capacity</code></li>
            <li>• Optional columns: <code>displayName</code>, <code>type</code>, <code>section</code>, <code>posX</code>, <code>posY</code>, <code>status</code></li>
            <li>• Valid types: regular, booth, bar, outdoor, private</li>
            <li>• Valid statuses: available, occupied, reserved, maintenance</li>
          </ul>
          <button
            onClick={handleDownloadSample}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Download Sample CSV
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select CSV File</label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            {file && (
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {previewing ? 'Validating...' : 'Preview'}
              </button>
            )}
          </div>
        </div>

        {/* Import Options */}
        {previewResult && previewResult.success && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-3">Import Options</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duplicate Handling
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="skip">Skip existing tables</option>
                  <option value="update">Update existing tables</option>
                  <option value="replace">Replace existing tables</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="updatePositions"
                  checked={updatePositions}
                  onChange={(e) => setUpdatePositions(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="updatePositions" className="text-sm">
                  Update table positions (only for 'update' mode)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Preview Results */}
        {previewResult && (
          <div className="mb-4">
            {/* Summary */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Preview Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Rows:</span>
                  <p className="font-medium">{previewResult.summary?.total || 0}</p>
                </div>
                <div>
                  <span className="text-gray-600">Valid:</span>
                  <p className="font-medium text-green-600">
                    {previewResult.summary?.successful || previewResult.preview?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <p className="font-medium text-red-600">
                    {previewResult.errors?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Duplicates:</span>
                  <p className="font-medium text-yellow-600">
                    {previewResult.summary?.duplicates || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Errors */}
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 rounded">
                <h3 className="font-medium mb-2 text-red-800 flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Errors ({previewResult.errors.length})
                </h3>
                <div className="max-h-32 overflow-y-auto">
                  {previewResult.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-700 mb-1">
                      Row {error.row}: {error.message} ({error.field})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {previewResult.warnings && previewResult.warnings.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 rounded">
                <h3 className="font-medium mb-2 text-yellow-800 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Warnings
                </h3>
                {previewResult.warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm text-yellow-700">
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table */}
            {previewResult.preview && previewResult.preview.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Tables to Import (showing first 10)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Number</th>
                        <th className="text-left p-2">Display Name</th>
                        <th className="text-left p-2">Capacity</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Section</th>
                        <th className="text-left p-2">Position</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.preview.slice(0, 10).map((table, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{table.number}</td>
                          <td className="p-2">{table.displayName || '-'}</td>
                          <td className="p-2">{table.capacity}</td>
                          <td className="p-2">{table.type}</td>
                          <td className="p-2">{table.section || '-'}</td>
                          <td className="p-2">
                            {table.position ? `${table.position.x}, ${table.position.y}` : '-'}
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              table.status === 'available' ? 'bg-green-100 text-green-800' :
                              table.status === 'occupied' ? 'bg-red-100 text-red-800' :
                              table.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {table.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewResult.preview.length > 10 && (
                    <p className="text-sm text-gray-600 mt-2">
                      ...and {previewResult.preview.length - 10} more tables
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          {previewResult?.success && previewResult.errors?.length === 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Tables'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableImport;