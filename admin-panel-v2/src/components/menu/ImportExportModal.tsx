import { useState } from 'react';
import { X, Download, Upload, FileText, Package, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MenuItem, Category } from '../../types/menu';
import { generateCategoryCSVTemplate, generateMenuItemCSVTemplate, generateMenuItemJSONTemplate } from '../../utils/menuTemplates';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any, type: 'categories' | 'items', format: 'csv' | 'json' | 'zip') => Promise<void>;
  onExport: (type: 'categories' | 'items', format: 'csv' | 'json') => Promise<void>;
  type: 'categories' | 'items';
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onExport,
  type
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'zip'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      
      // Preview for CSV/JSON files
      if (selectedFormat !== 'zip') {
        try {
          const text = await selectedFile.text();
          if (selectedFormat === 'csv') {
            // Basic CSV preview (first 5 rows)
            const lines = text.split('\n').slice(0, 6);
            setPreview(lines.map(line => line.split(',')));
          } else if (selectedFormat === 'json') {
            const data = JSON.parse(text);
            setPreview(Array.isArray(data) ? data.slice(0, 5) : [data]);
          }
        } catch (err) {
          setError('Failed to preview file');
        }
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let data: any;
      
      if (selectedFormat === 'zip') {
        // For ZIP files, we'll send the file directly
        data = file;
      } else {
        // For CSV/JSON, read and parse the file
        const text = await file.text();
        
        if (selectedFormat === 'csv') {
          // Parse CSV
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          
          data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const item: any = {};
            headers.forEach((header, index) => {
              item[header] = values[index];
            });
            return item;
          });
        } else {
          // Parse JSON
          data = JSON.parse(text);
        }
      }
      
      await onImport(data, type, selectedFormat);
      setSuccess(`Successfully imported ${type}`);
      
      // Reset after successful import
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setLoading(true);
      setError(null);
      await onExport(type, format);
      setSuccess(`Export completed successfully`);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Import/Export {type === 'categories' ? 'Categories' : 'Menu Items'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="inline-block h-4 w-4 mr-2" />
              Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'export'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="inline-block h-4 w-4 mr-2" />
              Export
            </button>
          </nav>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Format</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedFormat('csv')}
                  className={`p-4 border rounded-lg text-center ${
                    selectedFormat === 'csv' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <div className="font-medium">CSV File</div>
                  <div className="text-sm text-gray-500">Simple spreadsheet format</div>
                </button>

                <button
                  onClick={() => setSelectedFormat('json')}
                  className={`p-4 border rounded-lg text-center ${
                    selectedFormat === 'json' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <div className="font-medium">JSON File</div>
                  <div className="text-sm text-gray-500">With image URLs/base64</div>
                </button>

                <button
                  onClick={() => setSelectedFormat('zip')}
                  className={`p-4 border rounded-lg text-center ${
                    selectedFormat === 'zip' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <div className="font-medium">ZIP Archive</div>
                  <div className="text-sm text-gray-500">CSV + images folder</div>
                </button>
              </div>
            </div>

            {/* Format Instructions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">Format Instructions</h4>
                <button
                  onClick={() => {
                    let template: string;
                    let filename: string;
                    
                    if (selectedFormat === 'csv') {
                      template = type === 'categories' 
                        ? generateCategoryCSVTemplate() 
                        : generateMenuItemCSVTemplate();
                      filename = `${type}_template.csv`;
                    } else {
                      template = JSON.stringify(generateMenuItemJSONTemplate(), null, 2);
                      filename = `${type}_template.json`;
                    }
                    
                    const blob = new Blob([template], {
                      type: selectedFormat === 'csv' ? 'text/csv' : 'application/json'
                    });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Download Template
                </button>
              </div>
              {selectedFormat === 'csv' && (
                <div className="text-sm text-gray-600 space-y-2">
                  <p>CSV file should include the following columns:</p>
                  {type === 'categories' ? (
                    <ul className="list-disc list-inside ml-2">
                      <li>name (required)</li>
                      <li>nameAr</li>
                      <li>description</li>
                      <li>descriptionAr</li>
                      <li>icon</li>
                      <li>displayOrder</li>
                      <li>isActive (true/false)</li>
                      <li>imageUrl (external URL)</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside ml-2">
                      <li>name (required)</li>
                      <li>nameAr</li>
                      <li>category (required)</li>
                      <li>price (required)</li>
                      <li>cost</li>
                      <li>description</li>
                      <li>descriptionAr</li>
                      <li>available (true/false)</li>
                      <li>inStock (true/false)</li>
                      <li>imageUrl (external URL)</li>
                      <li>allergens (comma-separated)</li>
                      <li>dietary (comma-separated)</li>
                    </ul>
                  )}
                </div>
              )}
              {selectedFormat === 'json' && (
                <div className="text-sm text-gray-600">
                  <p>JSON file should be an array of objects with proper field names.</p>
                  <p className="mt-2">Images can be:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>External URLs in "imageUrl" field</li>
                    <li>Base64 encoded strings in "imageBase64" field</li>
                  </ul>
                </div>
              )}
              {selectedFormat === 'zip' && (
                <div className="text-sm text-gray-600">
                  <p>ZIP archive should contain:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>data.csv - The data file</li>
                    <li>images/ - Folder with image files</li>
                    <li>Reference images by filename in CSV</li>
                  </ul>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                accept={selectedFormat === 'csv' ? '.csv' : selectedFormat === 'json' ? '.json' : '.zip'}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Preview (first 5 rows)</h4>
                <div className="overflow-x-auto">
                  <pre className="text-xs">{JSON.stringify(preview, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {type === 'categories' ? 'Categories' : 'Items'}
              </button>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={loading}
                  className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 text-center"
                >
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                  <div className="font-medium text-lg">Export as CSV</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Spreadsheet format compatible with Excel
                  </div>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  disabled={loading}
                  className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 text-center"
                >
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                  <div className="font-medium text-lg">Export as JSON</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Complete data with all fields
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Exported files will include all current {type} data. Images will be exported as URLs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExportModal;