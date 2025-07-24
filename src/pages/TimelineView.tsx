import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext.tsx';

interface WorkOrder {
  id: string;
  work_order_number: string;
  customer_name: string;
  assembly_number: string;
  revision: string;
  quantity: number;
  status: string;
  kit_date: string | null;
  ship_date: string | null;
  setup_hours_estimated: number;
  production_hours_estimated: number;
  total_duration_hours: number;
  trolley_number: number | null;
  line_id: string | null;
  line_name: string | null;
  time_multiplier: number;
  line_position: number | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
}

interface ProductionLine {
  id: string;
  line_name: string;
  time_multiplier: number;
  active: boolean;
}

const TimelineView: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { connected, socketConnected, onWorkOrderUpdate, joinRooms } = useSocket();

  // Join Socket.IO room for real-time timeline updates
  useEffect(() => {
    if (socketConnected) {
      joinRooms(['timeline']);
    }
  }, [socketConnected, joinRooms]);

  // Listen for real-time work order updates (from both SSE and Socket.IO)
  useEffect(() => {
    const cleanup = onWorkOrderUpdate((update) => {
      console.log('📡 Received work order update:', update);
      
      // Update the work order in our local state
      setWorkOrders(prevOrders => {
        return prevOrders.map(wo => {
          if (wo.id === update.work_order.id) {
            return {
              ...wo,
              status: update.work_order.status,
              // Update other fields if available in the update
              customer_name: update.work_order.customer_name || wo.customer_name,
              assembly_number: update.work_order.assembly_number || wo.assembly_number,
              line_name: update.work_order.line_name || wo.line_name,
              quantity: update.work_order.quantity || wo.quantity,
              trolley_number: update.work_order.trolley_number || wo.trolley_number
            };
          }
          return wo;
        });
      });

      // Update last updated timestamp
      setLastUpdated(new Date().toLocaleTimeString());
      
      // Show a brief notification (you could make this more sophisticated)
      console.log(`✅ Updated ${update.work_order.work_order_number}: ${update.status_change.old_status} → ${update.status_change.new_status}`);
    });

    return cleanup;
  }, [onWorkOrderUpdate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'https://smtdatabase01-production.up.railway.app';
      const [timelineResponse, linesResponse] = await Promise.all([
        fetch(`${baseUrl}/api/schedule/timeline`),
        fetch(`${baseUrl}/api/production-lines`)
      ]);

      if (!timelineResponse.ok || !linesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const timelineData = await timelineResponse.json();
      const linesData = await linesResponse.json();

      setWorkOrders(timelineData.work_orders || []);
      setProductionLines(linesData.production_lines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1st Side Ready': return 'bg-sy-gold-500 text-sy-black-900';
      case 'Ready': return 'bg-sy-green-500 text-white';
      case 'Ready*': return 'bg-sy-green-400 text-sy-black-900';
      case 'Missing TSM-125-01-L-DV': return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    const days = Math.floor(hours / 8); // Assuming 8-hour work days
    const remainingHours = hours % 8;
    return remainingHours > 0 ? `${days}d ${remainingHours.toFixed(1)}h` : `${days}d`;
  };

  const groupWorkOrdersByLine = () => {
    const grouped: { [key: string]: WorkOrder[] } = {};
    
    // Initialize with all active lines
    productionLines.filter(line => line.active).forEach(line => {
      grouped[line.line_name] = [];
    });

    // Add unassigned work orders
    grouped['Unassigned'] = [];

    // Group work orders
    workOrders.forEach(wo => {
      const lineName = wo.line_name || 'Unassigned';
      if (grouped[lineName]) {
        grouped[lineName].push(wo);
      } else {
        grouped[lineName] = [wo];
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="bg-sy-black-50 flex items-center justify-center py-20">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sy-green-500"></div>
          <span className="text-sy-black-700">Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-sy-black-50 flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-sy-black-900 mb-2">Error Loading Timeline</h3>
          <p className="text-sy-black-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-sy-green-600 hover:bg-sy-green-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const groupedWorkOrders = groupWorkOrdersByLine();

  return (
    <div className="bg-sy-black-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-sy-black-900">
                  Production Timeline
                </h1>
                <p className="mt-1 text-sm text-sy-black-600">
                  Real-time view of work orders across all production lines
                  {lastUpdated && (
                    <span className="ml-2 text-xs text-sy-green-600">
                      • Last updated: {lastUpdated}
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                {/* Real-time Status */}
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-sy-black-600">
                    {connected ? 'Live Updates' : 'Offline'}
                  </span>
                </div>
                
                {/* Week selector */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="weeks" className="text-sm font-medium text-sy-black-700">
                    View:
                  </label>
                  <select
                    id="weeks"
                    value={selectedWeeks}
                    onChange={(e) => setSelectedWeeks(Number(e.target.value))}
                    className="rounded-md border border-sy-black-300 py-1 px-3 text-sm focus:border-sy-green-500 focus:outline-none focus:ring-1 focus:ring-sy-green-500"
                  >
                    <option value={1}>1 Week</option>
                    <option value={2}>2 Weeks</option>
                    <option value={4}>4 Weeks</option>
                    <option value={8}>8 Weeks</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-sy-black-900">
                Schedule Overview
              </h3>
              <div className="flex items-center space-x-4 text-sm text-sy-black-600">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {workOrders.length} work orders
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {productionLines.filter(l => l.active).length} active lines
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {Object.entries(groupedWorkOrders).map(([lineName, orders]) => (
              <div key={`line-${lineName}`} className="mb-8 last:mb-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-sy-black-900">
                    {lineName}
                    {lineName !== 'Unassigned' && (
                      <span className="ml-2 text-sm text-sy-black-600">
                        ({productionLines.find(l => l.line_name === lineName)?.time_multiplier}x multiplier)
                      </span>
                    )}
                  </h4>
                  <span className="text-sm text-sy-black-600">
                    {orders.length} work orders
                  </span>
                </div>

                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <div key={`empty-${lineName}`} className="text-center py-8 text-sy-black-500">
                      No work orders scheduled for this line
                    </div>
                  ) : (
                    <>
                      {/* Column Headers */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-sy-black-500 uppercase tracking-wider border-b border-gray-200">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-4">Work Order & Customer</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-center">Ship Date</div>
                        <div className="col-span-1 text-right">Rev</div>
                      </div>
                      {orders.map((wo, index) => (
                        <div
                          key={`${lineName}-${wo.id || wo.work_order_number}-${index}`}
                          className="grid grid-cols-12 gap-4 p-4 bg-sy-black-50 rounded-lg border border-gray-200 hover:border-sy-green-300 transition-colors items-center"
                        >
                        {/* Position */}
                        <div className="col-span-1 text-center">
                          <span className="text-sm font-medium text-sy-black-700">
                            #{index + 1}
                          </span>
                        </div>
                        
                        {/* Work Order Info */}
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-sy-black-900">
                            WO {wo.work_order_number}
                          </p>
                          <p className="text-sm text-sy-black-600 truncate">
                            {wo.customer_name} - {wo.assembly_number}
                          </p>
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                            {wo.status}
                          </span>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2 text-center">
                          <p className="text-sm font-medium text-sy-black-900">
                            {wo.quantity.toLocaleString()}
                          </p>
                          <p className="text-sm text-sy-black-600">
                            {formatDuration(wo.total_duration_hours)}
                          </p>
                        </div>

                        {/* Ship Date */}
                        <div className="col-span-2 text-center">
                          <p className="text-sm font-medium text-sy-black-900">
                            {formatDate(wo.ship_date)}
                          </p>
                          {wo.trolley_number && (
                            <p className="text-sm text-sy-black-600">
                              Trolley {wo.trolley_number}
                            </p>
                          )}
                        </div>

                        {/* Rev/Details */}
                        <div className="col-span-1 text-right">
                          <p className="text-xs text-sy-black-600">
                            Rev {wo.revision}
                          </p>
                        </div>
                      </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView; 