import React, { useState, useEffect, useCallback } from 'react';
import { 
  CogIcon, 
  PlayIcon, 
  PauseIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext.tsx';

interface ProductionLine {
  id: string;
  line_name: string;
  line_type: string | null;
  status: string | null;
  current_utilization: number | null;
  available_capacity: number | null;
  active: boolean | null;
  hours_per_shift: number | null;
  shifts_per_day: number | null;
  days_per_week: number | null;
  time_multiplier: number | null;
  start_time: string | null;
  end_time: string | null;
  lunch_break_duration: number | null;
  lunch_break_start: string | null;
  break_duration: number | null;
  created_at: string | null;
  updated_at: string | null;
  next_available_slot?: string;
  current_work_order?: string;
  efficiency_rating?: number;
  maintenance_due?: string;
  notes?: string;
}

interface LineConfig {
  hours_per_shift: number;
  shifts_per_day: number;
  days_per_week: number;
  time_multiplier: number;
  start_time: string;
  end_time: string;
  lunch_break_duration: number;
  lunch_break_start: string;
  break_duration: number;
  auto_schedule_enabled: boolean;
  maintenance_interval_days: number;
  efficiency_target: number;
}

const ProductionLines: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LineConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // API base URL
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin
    : 'https://smtdatabase01-production.up.railway.app';

  // Fetch production lines
  const fetchProductionLines = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/production-lines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`Failed to fetch production lines: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setProductionLines(data.production_lines || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching production lines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load production lines');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Update line configuration
  const updateLineConfig = async (lineId: string, config: LineConfig) => {
    if (!user || !['admin', 'scheduler'].includes(user.role)) {
      setError('Insufficient permissions to update line configuration');
      return;
    }

    setSaving(true);
    try {
      console.log('Sending config update:', { lineId, config });
      
      const response = await fetch(`${baseUrl}/api/production-lines/${lineId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      const responseData = await response.json();
      console.log('Response:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update line configuration');
      }
      
      await fetchProductionLines();
      setShowConfigModal(false);
      setSelectedLine(null);
      setEditingConfig(null);
      setError(null);
    } catch (err) {
      console.error('Error updating line config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update line configuration');
    } finally {
      setSaving(false);
    }
  };

  // Update line status
  const updateLineStatus = async (lineId: string, status: string) => {
    if (!user || !['admin', 'supervisor'].includes(user.role)) {
      setError('Insufficient permissions to update line status');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/production-lines/${lineId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update line status');
      
      await fetchProductionLines();
      setError(null);
    } catch (err) {
      console.error('Error updating line status:', err);
      setError('Failed to update line status');
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchProductionLines();
  }, [fetchProductionLines]);

  // Get status color
  const getStatusColor = (status: string | null | undefined) => {
    const statusStr = status?.toLowerCase() || 'idle';
    switch (statusStr) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get utilization color
  const getUtilizationColor = (utilization: number | null | undefined) => {
    const util = utilization || 0;
    if (util >= 90) return 'text-red-600';
    if (util >= 75) return 'text-orange-600';
    if (util >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Check if line is hand placement
  const isHandPlacement = (lineName: string | null | undefined) => {
    return lineName?.toLowerCase().includes('hand') || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sy-green-600 mx-auto mb-4"></div>
          <p className="text-sy-black-600">Loading production lines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sy-black-900">Production Lines</h1>
          <p className="mt-1 text-sm text-sy-black-600">
            Monitor and manage SMT production lines
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Production Lines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productionLines.map((line) => (
          <div key={line.id} className="bg-white shadow rounded-lg overflow-hidden">
            {/* Line Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-sy-black-900">{line.line_name}</h3>
                  <p className="text-sm text-sy-black-500">{line.line_type || 'SMT'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {isHandPlacement(line.line_name) && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Manual Only
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(line.status)}`}>
                    {line.status || 'idle'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Stats */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-sy-black-500">Utilization</p>
                  <p className={`font-medium ${getUtilizationColor(line.current_utilization)}`}>
                    {line.current_utilization || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sy-black-500">Available</p>
                  <p className="font-medium text-sy-black-900">
                    {line.available_capacity || 0}h
                  </p>
                </div>
                <div>
                  <p className="text-sy-black-500">Shifts/Day</p>
                  <p className="font-medium text-sy-black-900">
                    {line.shifts_per_day || 1}
                  </p>
                </div>
                <div>
                  <p className="text-sy-black-500">Hours/Shift</p>
                  <p className="font-medium text-sy-black-900">
                    {line.hours_per_shift || 8}h
                  </p>
                </div>
              </div>

              {/* Work Hours Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-sy-black-500 mb-2">Work Hours</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-sy-black-400">Shift:</span>
                    <span className="ml-1 text-sy-black-700">
                      {line.start_time || '08:00'} - {line.end_time || '17:00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sy-black-400">Lunch:</span>
                    <span className="ml-1 text-sy-black-700">
                      {line.lunch_break_start || '12:00'} ({line.lunch_break_duration || 60}m)
                    </span>
                  </div>
                  <div>
                    <span className="text-sy-black-400">Breaks:</span>
                    <span className="ml-1 text-sy-black-700">
                      {line.break_duration || 15}m
                    </span>
                  </div>
                  <div>
                    <span className="text-sy-black-400">Days/Week:</span>
                    <span className="ml-1 text-sy-black-700">
                      {line.days_per_week || 5}
                    </span>
                  </div>
                </div>
              </div>

              {/* Efficiency Rating */}
              {line.efficiency_rating && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sy-black-500">Efficiency</span>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-sy-black-900">
                        {line.efficiency_rating}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Warning */}
              {line.maintenance_due && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm text-orange-700">
                      Maintenance due: {new Date(line.maintenance_due).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Line Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {user && ['admin', 'supervisor'].includes(user.role) && (
                    <>
                      <button
                        onClick={() => updateLineStatus(line.id, 'running')}
                        disabled={(line.status || 'idle') === 'running'}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                      >
                        <PlayIcon className="h-3 w-3 mr-1" />
                        Start
                      </button>
                      <button
                        onClick={() => updateLineStatus(line.id, 'idle')}
                        disabled={(line.status || 'idle') === 'idle'}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50"
                      >
                        <PauseIcon className="h-3 w-3 mr-1" />
                        Pause
                      </button>
                      <button
                        onClick={() => updateLineStatus(line.id, 'maintenance')}
                        disabled={(line.status || 'idle') === 'maintenance'}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50"
                      >
                        <WrenchScrewdriverIcon className="h-3 w-3 mr-1" />
                        Maintenance
                      </button>
                    </>
                  )}
                </div>
                
                {user && ['admin', 'scheduler'].includes(user.role) && (
                  <button
                    onClick={() => {
                      setSelectedLine(line);
                      setEditingConfig({
                        hours_per_shift: line.hours_per_shift || 8,
                        shifts_per_day: line.shifts_per_day || 1,
                        days_per_week: line.days_per_week || 5,
                        time_multiplier: line.time_multiplier || 1,
                        start_time: line.start_time || '08:00',
                        end_time: line.end_time || '17:00',
                        lunch_break_duration: line.lunch_break_duration || 30,
                        lunch_break_start: line.lunch_break_start || '12:00',
                        break_duration: line.break_duration || 15,
                        auto_schedule_enabled: !isHandPlacement(line.line_name),
                        maintenance_interval_days: 30,
                        efficiency_target: 85
                      });
                      setShowConfigModal(true);
                    }}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-sy-black-700 bg-white hover:bg-gray-50"
                  >
                    <CogIcon className="h-3 w-3 mr-1" />
                    Config
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedLine && editingConfig && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => {
            setShowConfigModal(false);
            setSelectedLine(null);
            setEditingConfig(null);
          }}
        >
          <div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-sy-black-900">
                  Configure {selectedLine.line_name}
                </h3>
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setSelectedLine(null);
                    setEditingConfig(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Hours per Shift
                  </label>
                  <input
                    type="number"
                    value={editingConfig.hours_per_shift}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, hours_per_shift: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Shifts per Day
                  </label>
                  <input
                    type="number"
                    value={editingConfig.shifts_per_day}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, shifts_per_day: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Days per Week
                  </label>
                  <input
                    type="number"
                    value={editingConfig.days_per_week}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, days_per_week: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Time Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingConfig.time_multiplier}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, time_multiplier: parseFloat(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingConfig.start_time}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, start_time: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingConfig.end_time}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, end_time: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Lunch Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingConfig.lunch_break_duration}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, lunch_break_duration: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Lunch Break Start Time
                  </label>
                  <input
                    type="time"
                    value={editingConfig.lunch_break_start}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, lunch_break_start: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingConfig.break_duration}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev!, break_duration: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                {!isHandPlacement(selectedLine.line_name) && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="auto_schedule"
                      checked={editingConfig.auto_schedule_enabled}
                      onChange={(e) => setEditingConfig(prev => ({ ...prev!, auto_schedule_enabled: e.target.checked }))}
                      className="h-4 w-4 text-sy-green-600 focus:ring-sy-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="auto_schedule" className="ml-2 block text-sm text-sy-black-700">
                      Enable Auto-Scheduling
                    </label>
                  </div>
                )}
                
                {isHandPlacement(selectedLine.line_name) && (
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-purple-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-purple-800">Manual Only</h3>
                        <p className="mt-1 text-sm text-purple-700">
                          Hand placement lines are excluded from auto-scheduling and require manual assignment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setSelectedLine(null);
                    setEditingConfig(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-sy-black-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateLineConfig(selectedLine.id, editingConfig)}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sy-green-600 hover:bg-sy-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionLines; 