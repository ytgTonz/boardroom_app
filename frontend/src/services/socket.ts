import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Get socket URL from environment variable
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    
    if (import.meta.env.DEV) {
      console.log('🔌 Socket.IO connecting to:', socketUrl);
    }
    
    this.socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket.IO server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔌 Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', () => {
      console.log('🔌 Reconnected to Socket.IO server');
      this.reconnectAttempts = 0;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Room management
  joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('join-room', room);
    }
  }

  leaveRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('leave-room', room);
    }
  }

  // Booking event listeners
  onBookingCreated(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('booking-created', callback);
    }
  }

  onBookingUpdated(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('booking-updated', callback);
    }
  }

  onBookingCancelled(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('booking-cancelled', callback);
    }
  }

  onBookingDeleted(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('booking-deleted', callback);
    }
  }

  // Remove event listeners
  offBookingCreated(): void {
    if (this.socket) {
      this.socket.off('booking-created');
    }
  }

  offBookingUpdated(): void {
    if (this.socket) {
      this.socket.off('booking-updated');
    }
  }

  offBookingCancelled(): void {
    if (this.socket) {
      this.socket.off('booking-cancelled');
    }
  }

  offBookingDeleted(): void {
    if (this.socket) {
      this.socket.off('booking-deleted');
    }
  }

  // Remove all booking event listeners
  removeAllBookingListeners(): void {
    this.offBookingCreated();
    this.offBookingUpdated();
    this.offBookingCancelled();
    this.offBookingDeleted();
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;