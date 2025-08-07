import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';
import { Socket } from 'socket.io-client';

export interface BookingEvent {
  booking: any;
  boardroomId: string;
  changes?: {
    boardroomChanged: boolean;
    timeChanged: boolean;
    attendeesChanged: boolean;
  };
  cancelledBy?: 'admin' | 'user';
  deletedBy?: 'admin' | 'user';
}

export interface UseSocketOptions {
  autoConnect?: boolean;
  rooms?: string[];
  onBookingCreated?: (data: BookingEvent) => void;
  onBookingUpdated?: (data: BookingEvent) => void;
  onBookingCancelled?: (data: BookingEvent) => void;
  onBookingDeleted?: (data: BookingEvent) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    autoConnect = true,
    rooms = [],
    onBookingCreated,
    onBookingUpdated,
    onBookingCancelled,
    onBookingDeleted,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const roomsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!autoConnect) return;

    const socketInstance = socketService.connect();
    setSocket(socketInstance);

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      
      // Join rooms when connected
      rooms.forEach(room => {
        socketService.joinRoom(room);
      });
      roomsRef.current = [...rooms];
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);

    // Set up booking event listeners
    if (onBookingCreated) {
      socketService.onBookingCreated(onBookingCreated);
    }
    if (onBookingUpdated) {
      socketService.onBookingUpdated(onBookingUpdated);
    }
    if (onBookingCancelled) {
      socketService.onBookingCancelled(onBookingCancelled);
    }
    if (onBookingDeleted) {
      socketService.onBookingDeleted(onBookingDeleted);
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      
      // Leave rooms
      roomsRef.current.forEach(room => {
        socketService.leaveRoom(room);
      });
      
      // Remove booking event listeners
      socketService.removeAllBookingListeners();
    };
  }, [autoConnect, rooms, onBookingCreated, onBookingUpdated, onBookingCancelled, onBookingDeleted]);

  // Handle room changes
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Leave old rooms
    const oldRooms = roomsRef.current.filter(room => !rooms.includes(room));
    oldRooms.forEach(room => {
      socketService.leaveRoom(room);
    });

    // Join new rooms
    const newRooms = rooms.filter(room => !roomsRef.current.includes(room));
    newRooms.forEach(room => {
      socketService.joinRoom(room);
    });

    roomsRef.current = [...rooms];
  }, [socket, isConnected, rooms]);

  const connect = () => {
    if (!socket) {
      const socketInstance = socketService.connect();
      setSocket(socketInstance);
    }
  };

  const disconnect = () => {
    socketService.disconnect();
    setSocket(null);
    setIsConnected(false);
  };

  const joinRoom = (room: string) => {
    socketService.joinRoom(room);
    if (!roomsRef.current.includes(room)) {
      roomsRef.current.push(room);
    }
  };

  const leaveRoom = (room: string) => {
    socketService.leaveRoom(room);
    roomsRef.current = roomsRef.current.filter(r => r !== room);
  };

  return {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
  };
};

export default useSocket;