import React from 'react';
import { FileText, Upload, Trash2, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
  expiryDate?: string;
}

interface DocumentsFormProps {
  documents: Document[];
  onUpload: (file: File, type: string, expiryDate?: string) => Promise<void>;
  onDelete: (document: Document) => void;
  isUploading?: boolean;
}

const documentTypes = [
  'ID/Passport',
  'Visa',
  'Work Permit',
  'Insurance',
  'Contract',
  'Certificate',
  'Other'
];

export const DocumentsForm: React.FC<DocumentsFormProps> = ({
  documents,
  onUpload,
  onDelete,
  isUploading = false
}) => {
  const [selectedType, setSelectedType] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedType) {
      toast.error('Please select a document type first');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    try {
      await onUpload(file, selectedType, expiryDate || undefined);
      setSelectedType('');
      setExpiryDate('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <FileText className="h-5 w-5 mr-2" />
        Documents
      </h3>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Type</option>
              {documentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              disabled={!selectedType || isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedType || isUploading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Accepted formats: JPG, PNG, PDF (Max size: 5MB)
        </p>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Documents</h4>
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      Type: {doc.type} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      {doc.expiryDate && (
                        <>
                          {' • '}
                          <span className={new Date(doc.expiryDate) < new Date() ? 'text-red-500' : ''}>
                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDelete(doc)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};