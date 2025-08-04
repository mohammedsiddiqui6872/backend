import React, { useState } from 'react';
import { FileCheck, Download, Calendar } from 'lucide-react';
import { auditLogAPI } from '../../services/auditLogAPI';
import { AuditLog, ComplianceRegulation } from '../../types/auditLog';

interface ComplianceReportsProps {
  onLogSelect: (log: AuditLog) => void;
}

const ComplianceReports: React.FC<ComplianceReportsProps> = ({ onLogSelect }) => {
  const [selectedRegulation, setSelectedRegulation] = useState<ComplianceRegulation>('GDPR');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const regulations: ComplianceRegulation[] = ['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'SOX'];

  const generateReport = async () => {
    try {
      const report = await auditLogAPI.getComplianceReport(
        selectedRegulation,
        dateRange.start,
        dateRange.end
      );
      // Handle report display
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Compliance Report</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regulation
            </label>
            <select
              value={selectedRegulation}
              onChange={(e) => setSelectedRegulation(e.target.value as ComplianceRegulation)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {regulations.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={generateReport}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">GDPR Compliance</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm">
              Data Subject Access Requests
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm">
              Right to Erasure Requests
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-sm">
              Consent Management Log
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Compliance Events</h4>
          <p className="text-sm text-gray-500">
            View and analyze recent compliance-related activities
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceReports;