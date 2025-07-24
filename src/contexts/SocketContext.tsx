import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext.tsx';

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

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const { user } = useAuth();
  
  // Use refs to store callbacks to avoid recreating SSE connection
  const workOrderCallbacksRef = useRef<((update: WorkOrderUpdate) => void)[]>([]);
  const generalCallbacksRef = useRef<((data: any) => void)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('❌ No auth token available for SSE');
      return;
    }

    const isDev = process.env.NODE_ENV === 'development';
    
    // Always use production URL for SSE since we're running local dev against production
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

        // Route the update to appropriate callbacks
        if (data.type === 'work_order_update') {
          workOrderCallbacksRef.current.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in work order callback:', error);
            }
          });
        } else {
          // General update - send to all general callbacks
          generalCallbacksRef.current.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in general callback:', error);
            }
          });
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
  }, [user]); // Depend on user to reconnect when auth changes

  const onWorkOrderUpdate = (callback: (update: WorkOrderUpdate) => void) => {
    workOrderCallbacksRef.current.push(callback);
    
    // Return cleanup function
    return () => {
      workOrderCallbacksRef.current = workOrderCallbacksRef.current.filter(cb => cb !== callback);
    };
  };

  const onGeneralUpdate = (callback: (data: any) => void) => {
    generalCallbacksRef.current.push(callback);
    
    // Return cleanup function
    return () => {
      generalCallbacksRef.current = generalCallbacksRef.current.filter(cb => cb !== callback);
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