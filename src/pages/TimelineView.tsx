import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, AlertTriangle, RefreshCcwIcon, QrCodeIcon } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import StatusDropdown from '../components/StatusDropdown.tsx';
import QRCodeDisplay from '../components/QRCodeDisplay.tsx';

interface WorkOrder {
  id: string;
  work_order_number: string;
  line_number?: number | null;
  qr_code?: string | null;
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
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  const [userInteractions, setUserInteractions] = useState<Map<string, any>>(new Map());
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { 
    connected, 
    socketConnected, 
    onWorkOrderUpdate, 
    joinRooms, 
    roomUsers, 
    userCount,
    onUserJoinedRoom,
    onUserLeftRoom,
    onTimelineInteraction,
    sendTimelineInteraction,
    getRoomUsers
  } = useSocket();

  // Join Socket.IO room for real-time timeline updates
  useEffect(() => {
    if (socketConnected) {
      joinRooms(['timeline']);
      // Get current room users
      setTimeout(() => getRoomUsers('timeline'), 500);
    }
  }, [socketConnected, joinRooms, getRoomUsers]);

  // Listen for user presence changes
  useEffect(() => {
    const cleanupJoined = onUserJoinedRoom((data) => {
      console.log(`👋 ${data.user.username} joined the timeline view`);
      // Could show a notification here
    });

    const cleanupLeft = onUserLeftRoom((data) => {
      console.log(`👋 ${data.user.username} left the timeline view`);
      // Clear any interactions from this user
      setUserInteractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.user.user_id);
        return newMap;
      });
    });

    return () => {
      cleanupJoined();
      cleanupLeft();
    };
  }, [onUserJoinedRoom, onUserLeftRoom]);

  // Listen for timeline interactions from other users
  useEffect(() => {
    const cleanup = onTimelineInteraction((data) => {
      console.log(`🎯 ${data.user.username} interacted with ${data.work_order_number}`);
      
      setUserInteractions(prev => {
        const newMap = new Map(prev);
        newMap.set(data.user.user_id, {
          username: data.user.username,
          work_order_id: data.work_order_id,
          work_order_number: data.work_order_number,
          timestamp: data.timestamp,
          type: 'work_order_select'
        });
        return newMap;
      });

      // Clear interaction after 5 seconds
      setTimeout(() => {
        setUserInteractions(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user.user_id);
          return newMap;
        });
      }, 5000);
    });

    return cleanup;
  }, [onTimelineInteraction]);

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
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'https://smtdatabase01-production.up.railway.app';
      const token = localStorage.getItem('auth_token');
      const [timelineResponse, linesResponse] = await Promise.all([
        fetch(`${baseUrl}/api/schedule/timeline`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${baseUrl}/api/production-lines`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
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

  // Handle work order selection
  const handleWorkOrderSelect = (workOrderId: string, workOrderNumber: string) => {
    setSelectedWorkOrder(workOrderId);
    
    // Broadcast selection to other users
    sendTimelineInteraction('work_order_select', workOrderId, workOrderNumber);
    
    // Clear selection after 3 seconds
    setTimeout(() => {
      setSelectedWorkOrder(null);
    }, 3000);
  };

  // Handle status change from dropdown
  const handleStatusChange = async (workOrderId: string, newStatus: string) => {
    try {
      setStatusUpdateError(null);
      
          const baseUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin
        : 'http://localhost:8080';
      
      const response = await fetch(`${baseUrl}/api/timeline/work-orders/${workOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle token expiration by redirecting to login
        if (response.status === 401 && errorData.error?.includes('token')) {
          console.warn('Token expired, redirecting to login...');
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return;
        }
        
        throw new Error(errorData.error || 'Failed to update status');
      }

      const result = await response.json();
      
      // Update local state immediately for better UX
      setWorkOrders(prevOrders => 
        prevOrders.map(wo => 
          wo.id === workOrderId 
            ? { ...wo, status: newStatus }
            : wo
        )
      );

      // Clear any previous error
      setStatusUpdateError(null);
      
      console.log('Status updated successfully:', result);

    } catch (error) {
      console.error('Failed to update status:', error);
      setStatusUpdateError(error instanceof Error ? error.message : 'Failed to update status');
    }
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
                {/* QR Scanner Button */}
                <button
                  onClick={() => navigate('/scan')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sy-green-600 hover:bg-sy-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sy-green-500 transition-colors"
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  QR Scanner
                </button>
                
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
            
            {/* Status Update Error */}
            {statusUpdateError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Status Update Failed
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {statusUpdateError}
                    </p>
                    <button
                      onClick={() => setStatusUpdateError(null)}
                      className="text-sm text-red-600 hover:text-red-500 mt-2 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                        <div className="col-span-3">Work Order & Customer</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-center">Ship Date</div>
                        <div className="col-span-1 text-center">QR Code</div>
                      </div>
                      {orders.map((wo, index) => {
                        const isSelected = selectedWorkOrder === wo.id;
                        const hasUserInteraction = Array.from(userInteractions.values()).some(
                          interaction => interaction.work_order_id === wo.id
                        );
                        const interactingUser = Array.from(userInteractions.values()).find(
                          interaction => interaction.work_order_id === wo.id
                        );

                        return (
                          <div
                            key={`${lineName}-${wo.id || wo.work_order_number}-${index}`}
                            className={`grid grid-cols-12 gap-4 p-4 rounded-lg border transition-all cursor-pointer relative ${
                              isSelected 
                                ? 'bg-blue-100 border-blue-300 shadow-md' 
                                : hasUserInteraction
                                ? 'bg-amber-50 border-amber-300'
                                : 'bg-sy-black-50 border-gray-200 hover:border-sy-green-300'
                            } items-center`}
                            onClick={() => handleWorkOrderSelect(wo.id, wo.work_order_number)}
                          >
                            {/* User Interaction Indicator */}
                            {hasUserInteraction && interactingUser && (
                              <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                                👁️ {interactingUser.username}
                              </div>
                            )}

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                                ✓ Selected
                              </div>
                            )}

                            {/* Position */}
                            <div className="col-span-1 text-center">
                              <span className="text-sm font-medium text-sy-black-700">
                                #{index + 1}
                              </span>
                            </div>
                            
                            {/* Work Order Info */}
                            <div className="col-span-3">
                              <p className="text-sm font-medium text-sy-black-900">
                                WO {wo.work_order_number}-{wo.line_number || 1}
                              </p>
                              <p className="text-sm text-sy-black-600 truncate">
                                {wo.customer_name} - {wo.assembly_number}
                              </p>
                            </div>
                        
                        {/* Status */}
                        <div className="col-span-2">
                          {user && ['admin', 'scheduler', 'supervisor'].includes(user.role) ? (
                            <StatusDropdown
                              currentStatus={wo.status}
                              workOrderId={wo.id}
                              workOrderNumber={wo.work_order_number}
                              onStatusChange={handleStatusChange}
                            />
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                              {wo.status}
                            </span>
                          )}
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

                        {/* QR Code */}
                        <div className="col-span-1 text-center">
                          {wo.qr_code ? (
                            <QRCodeDisplay
                              qrCode={wo.qr_code}
                              workOrderNumber={wo.work_order_number}
                              lineNumber={wo.line_number}
                              size={64}
                              showLabel={false}
                              className="mx-auto"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">
                              No QR Code
                            </div>
                          )}
                        </div>
                      </div>
                        );
                      })}
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