import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Package, User, Calendar, AlertCircle, Wifi, WifiOff, ArrowLeftIcon } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext.tsx';

interface Job {
  id: string;
  work_order_number: string;
  customer_name: string;
  assembly_number: string;
  revision: string;
  quantity: number;
  status: string;
  setup_hours_estimated: number;
  production_hours_estimated: number;
  total_duration_hours: number;
  trolley_number: number | null;
  line_position: number | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  ship_date: string | null;
  position_label: string;
}

interface LineInfo {
  id: string;
  line_name: string;
  time_multiplier: number;
  active: boolean;
}

interface LineScheduleData {
  line_info: LineInfo;
  jobs: Job[];
  total_count: number;
}

const FloorDisplay: React.FC = () => {
  const { lineId } = useParams<{ lineId: string }>();
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState<LineScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Socket.IO integration for real-time updates
  const { 
    connected: sseConnected, 
    socketConnected, 
    joinRooms, 
    onWorkOrderUpdate,
    userCount 
  } = useSocket();

  useEffect(() => {
    if (lineId) {
      fetchLineSchedule();
      
      // Join the floor_display room for real-time updates
      if (socketConnected) {
        joinRooms(['floor_display']);
      }
      
      // Periodic refresh as backup (every 5 minutes)
      const interval = setInterval(fetchLineSchedule, 300000);
      return () => clearInterval(interval);
    }
  }, [lineId, socketConnected, joinRooms]);

  // Real-time update handler
  useEffect(() => {
    const unsubscribe = onWorkOrderUpdate((update) => {
      console.log('📺 Floor Display received real-time update:', update);
      
      // If the update affects our line, refresh the data
      const updateLineNumber = update.work_order?.line_number?.toString();
      if (updateLineNumber === lineId || !updateLineNumber) {
        fetchLineSchedule();
      }
    });

    return unsubscribe;
  }, [onWorkOrderUpdate, lineId]);

  // Socket.IO room joining effect
  useEffect(() => {
    if (socketConnected) {
      console.log('🏠 Floor Display joining room: floor_display');
      joinRooms(['floor_display']);
    }
  }, [socketConnected, joinRooms]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLineSchedule = async () => {
    if (!lineId) return;
    
    try {
      setLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'https://smtdatabase01-production.up.railway.app';
      const response = await fetch(`${baseUrl}/api/schedule/line/${lineId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch line schedule');
      }

      const data = await response.json();
      setScheduleData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1st Side Ready': return 'bg-yellow-500 text-black';
      case 'Ready': return 'bg-green-500 text-white';
      case 'Ready*': return 'bg-green-400 text-black';
      case 'Missing TSM-125-01-L-DV': return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    return remainingHours > 0 ? `${days}d ${remainingHours.toFixed(1)}h` : `${days}d`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sy-black-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sy-green-500 mx-auto mb-4"></div>
          <h3 className="text-2xl font-medium text-white">Loading Schedule...</h3>
        </div>
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="min-h-screen bg-sy-black-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
          <h3 className="text-3xl font-medium text-white mb-4">Error Loading Schedule</h3>
          <p className="text-xl text-gray-300 mb-8">{error || 'Production line not found'}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={fetchLineSchedule}
              className="bg-sy-green-600 hover:bg-sy-green-700 text-white px-8 py-4 rounded-lg text-xl"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/floor-display-select')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-xl flex items-center"
            >
              <ArrowLeftIcon className="h-6 w-6 mr-2" />
              Back to Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentJob = scheduleData.jobs.find(job => job.position_label === 'CURRENT');
  const nextJobs = scheduleData.jobs.filter(job => job.position_label.startsWith('NEXT'));

  return (
    <div className="min-h-screen bg-sy-black-900 text-white">
      {/* Header */}
      <div className="bg-sy-black-800 border-b-4 border-sy-green-500">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-5xl font-bold text-sy-green-400">
                {scheduleData.line_info.line_name}
              </h1>
              {scheduleData.line_info.time_multiplier !== 1 && (
                <span className="bg-sy-gold-500 text-sy-black-900 px-4 py-2 rounded-full text-xl font-semibold">
                  {scheduleData.line_info.time_multiplier}x Time
                </span>
              )}
              
              {/* Real-time Connection Status */}
              <div className="flex items-center space-x-4 ml-8">
                <div className="flex items-center space-x-2">
                  {sseConnected ? (
                    <Wifi className="h-6 w-6 text-sy-green-400" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${sseConnected ? 'text-sy-green-400' : 'text-red-400'}`}>
                    SSE
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-blue-400' : 'bg-gray-500'}`}></div>
                  <span className={`text-sm font-medium ${socketConnected ? 'text-blue-400' : 'text-gray-400'}`}>
                    Socket
                  </span>
                </div>
                
                {socketConnected && userCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-sy-gold-400" />
                    <span className="text-sy-gold-400 text-sm font-medium">
                      {userCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-mono text-sy-green-400 font-bold">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true 
                })}
              </div>
              <div className="text-xl text-gray-300">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Current Job */}
        {currentJob ? (
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-sy-green-400 mb-8 flex items-center">
              <Package className="h-10 w-10 mr-4" />
              CURRENT JOB
            </h2>
            
            <div className="bg-sy-black-800 rounded-2xl p-10 border-4 border-sy-green-500 shadow-2xl">
              <div className="grid grid-cols-3 gap-10">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">
                    WO {currentJob.work_order_number}
                  </h3>
                  <p className="text-2xl text-sy-green-300 mb-6">
                    {currentJob.customer_name}
                  </p>
                  <p className="text-xl text-gray-300">
                    {currentJob.assembly_number} Rev {currentJob.revision}
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-6">
                    <span className={`inline-flex items-center px-6 py-3 rounded-full text-xl font-bold ${getStatusColor(currentJob.status)} shadow-lg`}>
                      {currentJob.status}
                    </span>
                  </div>
                  <p className="text-5xl font-bold text-white mb-2">
                    {currentJob.quantity.toLocaleString()}
                  </p>
                  <p className="text-xl text-gray-300">Units</p>
                </div>

                <div className="text-right">
                  <p className="text-xl text-gray-300 mb-3">Estimated Duration</p>
                  <p className="text-5xl font-bold text-sy-gold-400 mb-4">
                    {formatDuration(currentJob.total_duration_hours)}
                  </p>
                  {currentJob.ship_date && (
                    <p className="text-xl text-gray-300">
                      Ship: {formatDate(currentJob.ship_date)}
                    </p>
                  )}
                </div>
              </div>

              {currentJob.trolley_number && (
                <div className="mt-8 pt-8 border-t border-gray-600">
                  <p className="text-2xl text-sy-gold-400">
                    <span className="text-gray-300">Trolley:</span> #{currentJob.trolley_number}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-sy-green-400 mb-8 flex items-center">
              <Package className="h-10 w-10 mr-4" />
              CURRENT JOB
            </h2>
            <div className="bg-sy-black-800 rounded-2xl p-16 border-4 border-gray-600 text-center">
              <Package className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <p className="text-3xl text-gray-400 font-medium">No job currently assigned</p>
              <p className="text-xl text-gray-500 mt-4">Waiting for next work order...</p>
            </div>
          </div>
        )}

        {/* Next Jobs */}
        <div>
          <h2 className="text-4xl font-bold text-sy-green-400 mb-8 flex items-center">
            <Clock className="h-10 w-10 mr-4" />
            COMING UP
          </h2>
          
          {nextJobs.length > 0 ? (
            <div className="space-y-8">
              {nextJobs.map((job, index) => (
                <div key={job.id} className="bg-sy-black-800 rounded-2xl p-8 border-2 border-gray-600 hover:border-sy-green-400 transition-colors shadow-lg">
                  <div className="grid grid-cols-4 gap-8 items-center">
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-2">
                        WO {job.work_order_number}
                      </h4>
                      <p className="text-xl text-sy-green-300 mb-2">
                        {job.customer_name}
                      </p>
                      <p className="text-lg text-gray-300">
                        {job.assembly_number}
                      </p>
                    </div>

                    <div className="text-center">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(job.status)} shadow-md`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-3xl font-bold text-white mb-1">
                        {job.quantity.toLocaleString()}
                      </p>
                      <p className="text-lg text-gray-300">Units</p>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold text-sy-gold-400 mb-2">
                        {formatDuration(job.total_duration_hours)}
                      </p>
                      {job.scheduled_start_time && (
                        <p className="text-lg text-gray-300">
                          Start: {formatTime(job.scheduled_start_time)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-sy-black-800 rounded-2xl p-16 border-2 border-gray-600 text-center">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <p className="text-2xl text-gray-400 font-medium">No upcoming jobs scheduled</p>
              <p className="text-lg text-gray-500 mt-4">Schedule will update automatically</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-sy-black-800 border-t border-gray-600 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6 text-gray-300">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <span>•</span>
            {(sseConnected || socketConnected) ? (
              <span className="text-sy-green-400 font-medium">Real-time updates active</span>
            ) : (
              <span className="text-yellow-400">Auto-refresh every 5 minutes</span>
            )}
            <span>•</span>
            <span>Line {lineId}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-300">
              SMT Production Database
            </div>
            {(sseConnected || socketConnected) && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-sy-green-400 rounded-full animate-pulse"></div>
                <span className="text-sy-green-400 text-sm">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorDisplay; 