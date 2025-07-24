import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WorkOrderUpdate {
  type: 'status_update';
  work_order: {
    id: string;
    work_order_number: string;
    qr_code?: string;
    customer_name: string;
    assembly_number: string;
    line_name?: string;
    line_number?: number;
    status: string;
    quantity?: number;
    trolley_number?: number;
  };
  status_change: {
    old_status: string;
    new_status: string;
    updated_by: string;
    timestamp: string;
  };
  timestamp: string;
}

interface GeneralUpdate {
  type: string;
  data: any;
  timestamp: string;
}

interface SSEContextType {
  connected: boolean;
  onWorkOrderUpdate: (callback: (update: WorkOrderUpdate) => void) => () => void;
  onGeneralUpdate: (callback: (update: GeneralUpdate) => void) => () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SSEProviderProps) {
  const [connected, setConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [workOrderCallbacks, setWorkOrderCallbacks] = useState<Array<(update: WorkOrderUpdate) => void>>([]);
  const [generalCallbacks, setGeneralCallbacks] = useState<Array<(update: GeneralUpdate) => void>>([]);

  useEffect(() => {
    // Get auth token from local storage or auth context
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found, skipping SSE connection');
      return;
    }

    // Determine the SSE URL based on environment
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? 'https://smtdatabase01-production.up.railway.app'
      : window.location.origin;

    // Include token in URL since EventSource doesn't support custom headers
    const eventSourceUrl = `${baseUrl}/api/events?token=${encodeURIComponent(token)}`;
    console.log('Connecting to SSE server:', eventSourceUrl);

    // Create EventSource connection
    const newEventSource = new EventSource(eventSourceUrl);
    
    newEventSource.onopen = () => {
      console.log('✅ Connected to SSE server');
      setConnected(true);
    };

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Received SSE update:', data);

        if (data.type === 'status_update') {
          // Notify all work order update callbacks
          workOrderCallbacks.forEach(callback => callback(data));
        } else if (data.type === 'connected') {
          console.log('Server connection confirmed:', data.message);
        } else if (data.type === 'heartbeat') {
          console.log('💓 SSE heartbeat received');
        } else {
          // Notify general update callbacks
          generalCallbacks.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setConnected(false);
    };

    setEventSource(newEventSource);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing SSE connection');
      newEventSource.close();
      setConnected(false);
    };
  }, [workOrderCallbacks, generalCallbacks]);

  const onWorkOrderUpdate = (callback: (update: WorkOrderUpdate) => void) => {
    setWorkOrderCallbacks(prev => [...prev, callback]);
    
    // Return cleanup function
    return () => {
      setWorkOrderCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  };

  const onGeneralUpdate = (callback: (update: GeneralUpdate) => void) => {
    setGeneralCallbacks(prev => [...prev, callback]);
    
    // Return cleanup function
    return () => {
      setGeneralCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  };

  const contextValue: SSEContextType = {
    connected,
    onWorkOrderUpdate,
    onGeneralUpdate
  };

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 