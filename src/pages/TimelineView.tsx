import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react';

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
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sy-green-500"></div>
          <span className="text-sy-black-700">Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-sy-black-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-sy-black-900">Production Timeline</h1>
                <p className="mt-1 text-sm text-sy-black-600">
                  {selectedWeeks}-week production schedule across all lines
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedWeeks}
                  onChange={(e) => setSelectedWeeks(Number(e.target.value))}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm rounded-md"
                >
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                  <option value={6}>6 weeks</option>
                </select>
                <button
                  onClick={fetchData}
                  className="bg-sy-green-600 hover:bg-sy-green-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Refresh
                </button>
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
              <div key={lineName} className="mb-8 last:mb-0">
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
                    <div className="text-center py-8 text-sy-black-500">
                      No work orders scheduled for this line
                    </div>
                  ) : (
                    orders.map((wo, index) => (
                      <div
                        key={wo.id}
                        className="flex items-center p-4 bg-sy-black-50 rounded-lg border border-gray-200 hover:border-sy-green-300 transition-colors"
                      >
                        <div className="flex-shrink-0 w-16 text-center">
                          <span className="text-sm font-medium text-sy-black-700">
                            #{index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="text-sm font-medium text-sy-black-900">
                                WO {wo.work_order_number}
                              </p>
                              <p className="text-sm text-sy-black-600">
                                {wo.customer_name} - {wo.assembly_number}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                                {wo.status}
                              </span>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-medium text-sy-black-900">
                                Qty: {wo.quantity.toLocaleString()}
                              </p>
                              <p className="text-sm text-sy-black-600">
                                {formatDuration(wo.total_duration_hours)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-sy-black-900">
                                Ship: {formatDate(wo.ship_date)}
                              </p>
                              {wo.trolley_number && (
                                <p className="text-sm text-sy-black-600">
                                  Trolley: {wo.trolley_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
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