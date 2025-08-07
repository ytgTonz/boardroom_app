// Socket.io has been removed from this application
// This file is kept as a placeholder to avoid breaking imports

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
  // Socket.io functionality has been removed
  // Return stub values to avoid breaking existing components
  
  return {
    socket: null,
    isConnected: false,
    connectionError: null,
    connect: () => {},
    disconnect: () => {},
    joinRoom: (room: string) => {},
    leaveRoom: (room: string) => {},
  };
};

export default useSocket;