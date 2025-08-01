import { useState } from 'react';
import { X, Download, QrCode, FileDown, Package, Loader2, Check, Settings } from 'lucide-react';
import { Table, QRExportOptions } from '../../types/table';
import { tableAPI } from '../../services/tableAPI';

interface QRCodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
}

const QRCodeManager: React.FC<QRCodeManagerProps> = ({
  isOpen,
  onClose,
  tables
}) => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip'>('pdf');
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<QRExportOptions>({
    format: 'pdf',
    includeTableNumbers: true,
    includeQRCode: true,
    paperSize: 'A4',
    qrSize: 150,
    customization: {
      headerText: 'Scan to Order',
      footerText: 'Powered by GRIT Services'
    }
  });

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map(t => t._id));
    }
  };

  const handleTableToggle = (tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      alert('Please select at least one table');
      return;
    }

    try {
      setLoading(true);
      await tableAPI.exportQRCodes({
        ...exportOptions,
        format: exportFormat,
        tableIds: selectedTables
      });
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      alert('Failed to export QR codes');
    } finally {
      setLoading(false);
    }
  };

  const getTableQRPreview = (table: Table) => {
    // Generate a simple QR code preview using a placeholder service
    const qrData = encodeURIComponent(table.qrCode.url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">QR Code Manager</h2>
            <p className="mt-1 text-sm text-gray-600">
              Generate and export QR codes for your tables
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Export Format Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setExportFormat('pdf')}
              className={`p-4 border rounded-lg text-center ${
                exportFormat === 'pdf'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileDown className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">PDF Document</div>
              <div className="text-sm text-gray-500 mt-1">
                All QR codes in a single PDF file
              </div>
            </button>

            <button
              onClick={() => setExportFormat('zip')}
              className={`p-4 border rounded-lg text-center ${
                exportFormat === 'zip'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">ZIP Archive</div>
              <div className="text-sm text-gray-500 mt-1">
                Individual PNG files for each table
              </div>
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code Size
                </label>
                <select
                  value={exportOptions.qrSize}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    qrSize: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="100">Small (100px)</option>
                  <option value="150">Medium (150px)</option>
                  <option value="200">Large (200px)</option>
                  <option value="300">Extra Large (300px)</option>
                </select>
              </div>

              {exportFormat === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paper Size
                  </label>
                  <select
                    value={exportOptions.paperSize}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      paperSize: e.target.value as 'A4' | 'Letter'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Text (Optional)
              </label>
              <input
                type="text"
                value={exportOptions.customization?.headerText || ''}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  customization: {
                    ...exportOptions.customization,
                    headerText: e.target.value
                  }
                })}
                placeholder="e.g., Scan to Order"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text (Optional)
              </label>
              <input
                type="text"
                value={exportOptions.customization?.footerText || ''}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  customization: {
                    ...exportOptions.customization,
                    footerText: e.target.value
                  }
                })}
                placeholder="e.g., Powered by Your Restaurant"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Table Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Select Tables</h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {selectedTables.length === tables.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-64 overflow-y-auto">
            {tables.map((table) => (
              <button
                key={table._id}
                onClick={() => handleTableToggle(table._id)}
                className={`relative p-3 border rounded-lg text-center transition-all ${
                  selectedTables.includes(table._id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedTables.includes(table._id) && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-5 w-5 text-primary-600" />
                  </div>
                )}
                
                <div className="mb-2">
                  <img
                    src={getTableQRPreview(table)}
                    alt={`QR for ${table.number}`}
                    className="w-16 h-16 mx-auto"
                  />
                </div>
                
                <div className="text-sm font-medium">
                  {table.displayName || table.number}
                </div>
                <div className="text-xs text-gray-500">
                  {table.location.floor} - {table.location.section}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''} selected
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading || selectedTables.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export QR Codes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeManager;