import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinRooms: (rooms: string[]) => void;
  leaveRooms: (rooms: string[]) => void;
  onWorkOrderUpdate: (callback: (update: WorkOrderUpdate) => void) => () => void;
  onGeneralUpdate: (callback: (update: GeneralUpdate) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Determine the WebSocket URL based on environment
    const isDev = process.env.NODE_ENV === 'development';
    const socketUrl = isDev 
      ? 'https://smtdatabase01-production.up.railway.app'  // Use Railway for dev too
      : window.location.origin; // Use same origin in production

    console.log('Connecting to Socket.IO server:', socketUrl);

    // Create socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
      timeout: 20000,
      autoConnect: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Connected to real-time server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time server');
      setConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Server connection confirmed:', data.message);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('joined_rooms', (data) => {
      console.log('✅ Joined rooms:', data.rooms);
    });

    newSocket.on('left_rooms', (data) => {
      console.log('👋 Left rooms:', data.rooms);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, []);

  const joinRooms = (rooms: string[]) => {
    if (socket && connected) {
      socket.emit('join_updates', { rooms });
    }
  };

  const leaveRooms = (rooms: string[]) => {
    if (socket && connected) {
      socket.emit('leave_updates', { rooms });
    }
  };

  const onWorkOrderUpdate = (callback: (update: WorkOrderUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('work_order_updated', callback);
    
    // Return cleanup function
    return () => {
      socket.off('work_order_updated', callback);
    };
  };

  const onGeneralUpdate = (callback: (update: GeneralUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('general_update', callback);
    
    // Return cleanup function
    return () => {
      socket.off('general_update', callback);
    };
  };

  const contextValue: SocketContextType = {
    socket,
    connected,
    joinRooms,
    leaveRooms,
    onWorkOrderUpdate,
    onGeneralUpdate
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 