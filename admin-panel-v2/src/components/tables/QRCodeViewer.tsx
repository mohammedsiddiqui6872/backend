import { X, Download, QrCode } from 'lucide-react';
import { Table } from '../../types/table';

interface QRCodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  floorName?: string;
  sectionName?: string;
}

const QRCodeViewer: React.FC<QRCodeViewerProps> = ({
  isOpen,
  onClose,
  table,
  floorName,
  sectionName
}) => {
  if (!isOpen || !table) return null;

  const getQRCodeUrl = () => {
    const qrData = encodeURIComponent(table.qrCode.url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getQRCodeUrl();
    link.download = `table-${table.number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            QR Code - {table.displayName || `Table ${table.number}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-8 flex flex-col items-center">
          <img
            src={getQRCodeUrl()}
            alt={`QR Code for ${table.number}`}
            className="w-64 h-64 mb-4"
          />
          
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-1">
              {floorName || table.location.floor} - {sectionName || table.location.section}
            </p>
            <p className="text-xs text-gray-500">
              Scan to access table ordering
            </p>
          </div>

          <div className="w-full space-y-2">
            <button
              onClick={handleDownload}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </button>
            
            <div className="bg-white rounded p-3 border border-gray-200">
              <p className="text-xs text-gray-600 text-center break-all">
                {table.qrCode.url}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeViewer;