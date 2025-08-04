import { useState, useRef, useEffect } from 'react';
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

const ImportExportModalFixed: React.FC<ImportExportModalProps> = ({
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
  
  // Use refs to store timeout IDs for cleanup
  const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
      if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

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

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
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
        // For zip files, pass the file directly to the import handler
        data = file;
      } else {
        const text = await file.text();
        if (selectedFormat === 'csv') {
          data = parseCSV(text);
        } else {
          // Parse JSON
          data = JSON.parse(text);
        }
      }
      
      await onImport(data, type, selectedFormat);
      setSuccess(`Successfully imported ${type}`);
      
      // Reset after successful import with cleanup
      importTimeoutRef.current = setTimeout(() => {
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
      
      // Clear success message after 3 seconds with cleanup
      exportTimeoutRef.current = setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (type === 'categories') {
      if (format === 'csv') {
        content = generateCategoryCSVTemplate();
        filename = 'category_template.csv';
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify([
          {
            name: "Main Course",
            description: "Delicious main dishes",
            displayOrder: 1,
            isActive: true
          }
        ], null, 2);
        filename = 'category_template.json';
        mimeType = 'application/json';
      }
    } else {
      if (format === 'csv') {
        content = generateMenuItemCSVTemplate();
        filename = 'menu_items_template.csv';
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(generateMenuItemJSONTemplate(), null, 2);
        filename = 'menu_items_template.json';
        mimeType = 'application/json';
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('Template downloaded');
    successTimeoutRef.current = setTimeout(() => setSuccess(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Import/Export {type === 'categories' ? 'Categories' : 'Menu Items'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'import'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'export'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {activeTab === 'import' ? (
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3 border rounded-lg text-center ${
                      selectedFormat === 'csv'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <span className="text-sm font-medium">CSV</span>
                  </button>
                  <button
                    onClick={() => setSelectedFormat('json')}
                    className={`p-3 border rounded-lg text-center ${
                      selectedFormat === 'json'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <span className="text-sm font-medium">JSON</span>
                  </button>
                  <button
                    onClick={() => setSelectedFormat('zip')}
                    className={`p-3 border rounded-lg text-center ${
                      selectedFormat === 'zip'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <span className="text-sm font-medium">ZIP (with images)</span>
                  </button>
                </div>
              </div>

              {/* Download Template */}
              {selectedFormat !== 'zip' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    Need a template? Download our sample file to see the required format.
                  </p>
                  <button
                    onClick={() => downloadTemplate(selectedFormat as 'csv' | 'json')}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Download {selectedFormat.toUpperCase()} Template
                  </button>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept={selectedFormat === 'csv' ? '.csv' : selectedFormat === 'json' ? '.json' : '.zip'}
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedFormat === 'csv' && 'CSV files only'}
                      {selectedFormat === 'json' && 'JSON files only'}
                      {selectedFormat === 'zip' && 'ZIP files with images'}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Preview */}
              {file && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Selected File</span>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  
                  {preview && (
                    <div className="mt-3 max-h-48 overflow-auto">
                      <p className="text-xs text-gray-500 mb-2">Preview (first 5 items)</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded">
                        {JSON.stringify(preview, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Import Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 inline mr-2" />
                      Import {type === 'categories' ? 'Categories' : 'Items'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-600">
                Export your {type === 'categories' ? 'categories' : 'menu items'} to a file for backup or external use.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={loading}
                  className="p-4 border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50"
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium">Export as CSV</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Spreadsheet format, easy to edit
                  </p>
                </button>
                
                <button
                  onClick={() => handleExport('json')}
                  disabled={loading}
                  className="p-4 border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50"
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium">Export as JSON</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Complete data with all fields
                  </p>
                </button>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600" />
                  <p className="text-sm text-gray-600 mt-2">Preparing export...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportExportModalFixed;