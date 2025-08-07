// Socket.io has been removed from this application
// This file is kept as a placeholder to avoid breaking imports

class SocketService {
  connect() {
    // No-op: Socket.io functionality removed
    return null;
  }

  disconnect() {
    // No-op: Socket.io functionality removed
  }

  getSocket() {
    return null;
  }

  joinRoom(room: string) {
    // No-op: Socket.io functionality removed
  }

  leaveRoom(room: string) {
    // No-op: Socket.io functionality removed
  }

  onBookingCreated(callback: (data: any) => void) {
    // No-op: Socket.io functionality removed
  }

  onBookingUpdated(callback: (data: any) => void) {
    // No-op: Socket.io functionality removed
  }

  onBookingCancelled(callback: (data: any) => void) {
    // No-op: Socket.io functionality removed
  }

  onBookingDeleted(callback: (data: any) => void) {
    // No-op: Socket.io functionality removed
  }

  offBookingCreated() {
    // No-op: Socket.io functionality removed
  }

  offBookingUpdated() {
    // No-op: Socket.io functionality removed
  }

  offBookingCancelled() {
    // No-op: Socket.io functionality removed
  }

  offBookingDeleted() {
    // No-op: Socket.io functionality removed
  }

  removeAllBookingListeners() {
    // No-op: Socket.io functionality removed
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;