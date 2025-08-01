import React, { useState, useEffect } from 'react';
import { Link2, Unlink, Users, Grid3X3, Layers } from 'lucide-react';
import { Table } from '../../types/table';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface TableCombinationProps {
  table: Table;
  onCombine: () => void;
  onSplit: () => void;
  onClose: () => void;
}

interface CombinableTable {
  _id: string;
  number: string;
  displayName: string;
  capacity: number;
  location: any;
  status: string;
  type: string;
}

const ARRANGEMENT_OPTIONS = [
  { value: 'linear', label: 'Linear', icon: '═══', description: 'Tables in a straight line' },
  { value: 'square', label: 'Square', icon: '□', description: 'Tables forming a square' },
  { value: 'L-shape', label: 'L-Shape', icon: '└', description: 'Tables in L configuration' },
  { value: 'U-shape', label: 'U-Shape', icon: '∪', description: 'Tables in U configuration' },
  { value: 'custom', label: 'Custom', icon: '✦', description: 'Custom arrangement' }
];

const TableCombination: React.FC<TableCombinationProps> = ({
  table,
  onCombine,
  onSplit,
  onClose
}) => {
  const [combinableTables, setCombinableTables] = useState<CombinableTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [arrangement, setArrangement] = useState<string>('linear');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (table && !table.combination?.isCombined) {
      fetchCombinableTables();
    } else {
      setFetching(false);
    }
  }, [table]);

  const fetchCombinableTables = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/admin/tables/combination/${table._id}/combinable`);
      if (response.data.success) {
        setCombinableTables(response.data.combinableTables);
      }
    } catch (error) {
      console.error('Error fetching combinable tables:', error);
      toast.error('Failed to fetch combinable tables');
    } finally {
      setFetching(false);
    }
  };

  const handleTableToggle = (tableNumber: string) => {
    const newSelection = new Set(selectedTables);
    if (newSelection.has(tableNumber)) {
      newSelection.delete(tableNumber);
    } else {
      newSelection.add(tableNumber);
    }
    setSelectedTables(newSelection);
  };

  const calculateTotalCapacity = () => {
    let total = table.capacity;
    selectedTables.forEach(tableNumber => {
      const selectedTable = combinableTables.find(t => t.number === tableNumber);
      if (selectedTable) {
        total += selectedTable.capacity;
      }
    });
    return total;
  };

  const handleCombine = async () => {
    if (selectedTables.size === 0) {
      toast.error('Please select at least one table to combine');
      return;
    }

    setLoading(true);
    try {
      const tablesToCombine = Array.from(selectedTables).map(tableNumber => ({
        tableNumber
      }));

      const response = await api.post(`/admin/tables/combination/${table._id}/combine`, {
        tablesToCombine,
        arrangement
      });

      if (response.data.success) {
        toast.success(response.data.message);
        onCombine();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to combine tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSplit = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/admin/tables/combination/${table._id}/split`);
      if (response.data.success) {
        toast.success(response.data.message);
        onSplit();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to split tables');
    } finally {
      setLoading(false);
    }
  };

  // If table is already combined, show split UI
  if (table.combination?.isCombined) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Unlink className="h-5 w-5 mr-2" />
            Split Combined Tables
          </h2>

          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">Current Combination:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Main Table:</span>
                  <span>{table.displayName || `Table ${table.number}`}</span>
                </div>
                {table.combination.isMainTable && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Combined Tables:</span>
                      <span>{table.combination.combinedTables?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Capacity:</span>
                      <span>{table.combination.totalCapacity || table.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Arrangement:</span>
                      <span className="capitalize">{table.combination.arrangement}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!table.combination.isMainTable && (
              <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-800">
                This table is part of a combination. Splitting will separate all tables in the combination.
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSplit}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Splitting...' : 'Split Tables'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show combination UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Link2 className="h-5 w-5 mr-2" />
          Combine Tables
        </h2>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Main Table</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Number:</span>
                    <p className="font-medium">{table.number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Display Name:</span>
                    <p className="font-medium">{table.displayName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Capacity:</span>
                    <p className="font-medium">{table.capacity}</p>
                  </div>
                </div>
              </div>
            </div>

            {!table.isCombinable ? (
              <div className="p-4 bg-yellow-50 rounded-lg text-yellow-800">
                This table is not marked as combinable. Please update the table settings to enable combination.
              </div>
            ) : combinableTables.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                No tables available to combine with this table.
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Select Tables to Combine</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {combinableTables.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => handleTableToggle(t.number)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTables.has(t.number)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{t.displayName || `Table ${t.number}`}</span>
                          <input
                            type="checkbox"
                            checked={selectedTables.has(t.number)}
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Capacity: {t.capacity}</p>
                          <p>Type: {t.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-medium mb-2">Arrangement Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ARRANGEMENT_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => setArrangement(option.value)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          arrangement === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{option.icon}</div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium">Total Capacity After Combination:</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {calculateTotalCapacity()}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              {table.isCombinable && combinableTables.length > 0 && (
                <button
                  onClick={handleCombine}
                  disabled={loading || selectedTables.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Combining...' : `Combine ${selectedTables.size + 1} Tables`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TableCombination;