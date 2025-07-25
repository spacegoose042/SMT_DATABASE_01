import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext.tsx';
import { io, Socket } from 'socket.io-client';

interface WorkOrderUpdate {
  type: 'work_order_update';
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

interface RoomUser {
  user_id: string;
  username: string;
  role: string;
}

interface UserPresence {
  user: RoomUser;
  room: string;
  user_count: number;
  timestamp: string;
}

interface TimelineInteraction {
  user: RoomUser;
  work_order_id: string;
  work_order_number: string;
  timestamp: string;
}

interface SSEContextType {
  connected: boolean;
  socketConnected: boolean;
  onWorkOrderUpdate: (callback: (update: WorkOrderUpdate) => void) => () => void;
  onGeneralUpdate: (callback: (data: any) => void) => () => void;
  joinRooms: (rooms: string[]) => void;
  // Phase 3 features
  roomUsers: RoomUser[];
  userCount: number;
  onUserJoinedRoom: (callback: (data: UserPresence) => void) => () => void;
  onUserLeftRoom: (callback: (data: UserPresence) => void) => () => void;
  onTimelineInteraction: (callback: (data: TimelineInteraction) => void) => () => void;
  sendTimelineInteraction: (type: string, workOrderId: string, workOrderNumber: string) => void;
  getRoomUsers: (room: string) => void;
  emit: (event: string, data: any) => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false); // SSE connection
  const [socketConnected, setSocketConnected] = useState(false); // Socket.IO connection
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [userCount, setUserCount] = useState(0);
  const { user } = useAuth();
  
  // Use refs to store callbacks to avoid recreating connections
  const workOrderCallbacksRef = useRef<((update: WorkOrderUpdate) => void)[]>([]);
  const generalCallbacksRef = useRef<((data: any) => void)[]>([]);
  const userJoinedCallbacksRef = useRef<((data: UserPresence) => void)[]>([]);
  const userLeftCallbacksRef = useRef<((data: UserPresence) => void)[]>([]);
  const timelineInteractionCallbacksRef = useRef<((data: TimelineInteraction) => void)[]>([]);

  // SSE Connection Setup
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

  // Socket.IO Connection Setup with Phase 3 Features
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('❌ No auth token available for Socket.IO');
      return;
    }

    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? 'https://smtdatabase01-production.up.railway.app'
      : window.location.origin;

    console.log('🔌 Connecting to Socket.IO server:', baseUrl);

    // Create Socket.IO connection with auth
    const newSocket = io(baseUrl, {
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      setSocketConnected(false);
      setRoomUsers([]);
      setUserCount(0);
    });

    newSocket.on('connected', (data) => {
      console.log('🔗 Socket.IO handshake:', data);
    });

    newSocket.on('work_order_update', (data) => {
      console.log('🚀 Received Socket.IO work order update:', data);
      
      // Route to work order callbacks (same as SSE)
      workOrderCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in Socket.IO work order callback:', error);
        }
      });
    });

    // Phase 3: User presence events
    newSocket.on('room_joined', (data) => {
      console.log('🏠 Room joined:', data);
      if (data.users_in_room) {
        setRoomUsers(data.users_in_room);
        setUserCount(data.user_count);
      }
    });

    newSocket.on('user_joined_room', (data) => {
      console.log('👋 User joined room:', data);
      setUserCount(data.user_count);
      
      userJoinedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in user joined callback:', error);
        }
      });
    });

    newSocket.on('user_left_room', (data) => {
      console.log('👋 User left room:', data);
      setUserCount(data.user_count);
      
      userLeftCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in user left callback:', error);
        }
      });
    });

    newSocket.on('room_users_update', (data) => {
      console.log('👥 Room users update:', data);
      setRoomUsers(data.users);
      setUserCount(data.user_count);
    });

    // Timeline interaction events
    newSocket.on('timeline_work_order_selected', (data) => {
      console.log('🎯 Timeline work order selected:', data);
      
      timelineInteractionCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in timeline interaction callback:', error);
        }
      });
    });

    newSocket.on('timeline_status_change_start', (data) => {
      console.log('🔄 Timeline status change start:', data);
      
      timelineInteractionCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in timeline interaction callback:', error);
        }
      });
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing Socket.IO connection');
      newSocket.disconnect();
      setSocketConnected(false);
      setRoomUsers([]);
      setUserCount(0);
    };
  }, [user]);

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

  const onUserJoinedRoom = (callback: (data: UserPresence) => void) => {
    userJoinedCallbacksRef.current.push(callback);
    
    return () => {
      userJoinedCallbacksRef.current = userJoinedCallbacksRef.current.filter(cb => cb !== callback);
    };
  };

  const onUserLeftRoom = (callback: (data: UserPresence) => void) => {
    userLeftCallbacksRef.current.push(callback);
    
    return () => {
      userLeftCallbacksRef.current = userLeftCallbacksRef.current.filter(cb => cb !== callback);
    };
  };

  const onTimelineInteraction = (callback: (data: TimelineInteraction) => void) => {
    timelineInteractionCallbacksRef.current.push(callback);
    
    return () => {
      timelineInteractionCallbacksRef.current = timelineInteractionCallbacksRef.current.filter(cb => cb !== callback);
    };
  };

  const joinRooms = (rooms: string[]) => {
    if (socket && socketConnected) {
      rooms.forEach(room => {
        console.log(`🏠 Joining Socket.IO room: ${room}`);
        socket.emit('join_room', { room });
      });
    } else {
      console.log('⚠️ Socket.IO not connected, cannot join rooms');
    }
  };

  const sendTimelineInteraction = (type: string, workOrderId: string, workOrderNumber: string) => {
    if (socket && socketConnected) {
      socket.emit('timeline_interaction', {
        type,
        work_order_id: workOrderId,
        work_order_number: workOrderNumber
      });
    }
  };

  const getRoomUsers = (room: string) => {
    if (socket && socketConnected) {
      socket.emit('get_room_users', { room });
    }
  };

  const emit = (event: string, data: any) => {
    if (socket && socketConnected) {
      socket.emit(event, data);
    }
  };

  return (
    <SSEContext.Provider value={{
      connected,
      socketConnected,
      onWorkOrderUpdate,
      onGeneralUpdate,
      joinRooms,
      roomUsers,
      userCount,
      onUserJoinedRoom,
      onUserLeftRoom,
      onTimelineInteraction,
      sendTimelineInteraction,
      getRoomUsers,
      emit
    }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 