import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCodeIcon, CameraIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSocket } from '../contexts/SocketContext.tsx';
import QrScanner from 'react-qr-scanner';

interface WorkOrderData {
  id: string;
  work_order_number: string;
  line_number: number;
  qr_code: string;
  customer_name: string;
  assembly_number: string;
  revision: string;
  quantity: number;
  status: string;
  line_name?: string;
  trolley_number?: number;
  ship_date?: string;
  kit_date?: string;
  setup_hours_estimated?: number;
  production_hours_estimated?: number;
}

interface ScanResult {
  type: 'success' | 'error';
  message: string;
  workOrder?: WorkOrderData;
}

const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit } = useSocket();
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  // Fetch available statuses on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production'
          ? window.location.origin
          : 'http://localhost:8080';
        const response = await fetch(`${baseUrl}/api/mobile/statuses`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const statuses = data.statuses.map((status: any) => status.value);
          setStatusOptions(statuses);
        } else {
          // Fallback to hardcoded statuses if API fails
          setStatusOptions([
            '1st Side Ready', 'Ready', 'Ready*', 'In Progress', 'Setup', 
            'Running', 'Quality Check', 'On Hold', 'Issues', 'Completed',
            'Missing TSM-125-01-L-DV', 'Cancelled'
          ]);
        }
      } catch (error) {
        console.error('Error fetching statuses:', error);
        // Fallback to hardcoded statuses
        setStatusOptions([
          '1st Side Ready', 'Ready', 'Ready*', 'In Progress', 'Setup', 
          'Running', 'Quality Check', 'On Hold', 'Issues', 'Completed',
          'Missing TSM-125-01-L-DV', 'Cancelled'
        ]);
      }
    };

    fetchStatuses();
  }, []);

  // Request camera permission on mount
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        // Stop the stream immediately, we just needed to check permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera permission denied:', error);
        setHasPermission(false);
      }
    };

    requestCameraPermission();
  }, []);

  // Handle QR code scan
  const handleScan = useCallback(async (data: string | null) => {
    if (!data || !data.trim()) return;

    console.log('QR Code scanned:', data);
    setScanning(false);

    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/mobile/qr/${encodeURIComponent(data)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        const workOrderData = responseData.work_order; // Extract from the nested structure
        setWorkOrder(workOrderData);
        setScanResult({
          type: 'success',
          message: `Work Order ${workOrderData.work_order_number}-${workOrderData.line_number} found!`,
          workOrder: workOrderData
        });
      } else {
        const errorData = await response.json();
        setScanResult({
          type: 'error',
          message: errorData.error || 'Work order not found'
        });
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      setScanResult({
        type: 'error',
        message: 'Failed to scan QR code. Please try again.'
      });
    }
  }, []);

  // Handle scan error
  const handleError = useCallback((error: any) => {
    console.error('QR Scanner error:', error);
    setScanResult({
      type: 'error',
      message: 'Camera error. Please check permissions and try again.'
    });
  }, []);

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!workOrder) return;

    setUpdating(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/timeline/work-orders/${workOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setWorkOrder(prev => prev ? { ...prev, status: newStatus } : null);
        setScanResult({
          type: 'success',
          message: `Status updated to ${newStatus}!`
        });

        // Emit real-time update
        emit('work_order_updated', {
          workOrderId: workOrder.id,
          status: newStatus,
          updatedBy: user?.username
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setScanResult({
        type: 'error',
        message: 'Failed to update status. Please try again.'
      });
    } finally {
      setUpdating(false);
    }
  };

  // Start scanning
  const startScanning = () => {
    setScanning(true);
    setScanResult(null);
    setWorkOrder(null);
  };

  // Stop scanning
  const stopScanning = () => {
    setScanning(false);
  };

  // Reset to scan again
  const resetScan = () => {
    setScanResult(null);
    setWorkOrder(null);
    startScanning();
  };

  if (hasPermission === null) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
        <div className="text-center">
          <CameraIcon className="h-12 w-12 text-sy-black-400 mx-auto mb-4" />
          <p className="text-sy-black-600">Checking camera permissions...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-sy-black-900 mb-2">Camera Access Required</h2>
          <p className="text-sy-black-600 mb-6">
            Please enable camera access in your browser settings to scan QR codes.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-sy-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sy-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sy-black-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-sy-black-900 flex items-center">
              <QrCodeIcon className="h-6 w-6 mr-2 text-sy-green-600" />
              QR Scanner
            </h1>
            <button
              onClick={() => navigate('/timeline')}
              className="text-sy-black-600 hover:text-sy-black-900 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Scanner Section */}
        {!workOrder && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-sy-black-900 mb-4">
                Scan Work Order QR Code
              </h2>
              
              {!scanning ? (
                <div className="text-center py-8">
                  <QrCodeIcon className="h-24 w-24 text-sy-black-300 mx-auto mb-4" />
                  <p className="text-sy-black-600 mb-6">
                    Position the QR code within the camera frame to scan
                  </p>
                  <button
                    onClick={startScanning}
                    className="bg-sy-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-sy-green-700 transition-colors flex items-center mx-auto"
                  >
                    <CameraIcon className="h-5 w-5 mr-2" />
                    Start Scanner
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
                    <QrScanner
                      delay={300}
                      onError={handleError}
                      onScan={handleScan}
                      style={{ width: '100%', height: '100%' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-sy-green-400 rounded-tl"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-sy-green-400 rounded-tr"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-sy-green-400 rounded-bl"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-sy-green-400 rounded-br"></div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={stopScanning}
                    className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Stop Scanner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`p-4 rounded-lg ${
            scanResult.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {scanResult.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              )}
              <p className={`font-medium ${
                scanResult.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {scanResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Work Order Details */}
        {workOrder && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-sy-black-900">
                WO {workOrder.work_order_number}-{workOrder.line_number}
              </h2>
              <p className="text-sm text-sy-black-600">
                {workOrder.customer_name} - {workOrder.assembly_number}
              </p>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-sy-black-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    workOrder.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    workOrder.status === 'In Progress' || workOrder.status === 'Running' ? 'bg-blue-100 text-blue-800' :
                    workOrder.status === 'On Hold' || workOrder.status === 'Issues' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {workOrder.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-sy-black-700">Quantity:</span>
                  <span className="ml-2 text-sy-black-900">{workOrder.quantity}</span>
                </div>
                <div>
                  <span className="font-medium text-sy-black-700">Revision:</span>
                  <span className="ml-2 text-sy-black-900">{workOrder.revision}</span>
                </div>
                {workOrder.line_name && (
                  <div>
                    <span className="font-medium text-sy-black-700">SMT Line:</span>
                    <span className="ml-2 text-sy-black-900">{workOrder.line_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Update Section */}
        {workOrder && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-sy-black-900">Update Status</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={updating || workOrder.status === status}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      workOrder.status === status
                        ? 'bg-sy-green-100 border-sy-green-300 text-sy-green-800 cursor-default'
                        : updating
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-sy-black-700 hover:bg-sy-black-50 hover:border-sy-green-300'
                    }`}
                  >
                    {workOrder.status === status && <CheckCircleIcon className="h-4 w-4 inline mr-1" />}
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {workOrder && (
          <div className="flex gap-3">
            <button
              onClick={resetScan}
              className="flex-1 bg-sy-green-600 text-white py-3 rounded-lg font-medium hover:bg-sy-green-700 transition-colors"
            >
              Scan Another
            </button>
            <button
              onClick={() => navigate('/timeline')}
              className="flex-1 bg-sy-black-600 text-white py-3 rounded-lg font-medium hover:bg-sy-black-700 transition-colors"
            >
              Back to Timeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage; 