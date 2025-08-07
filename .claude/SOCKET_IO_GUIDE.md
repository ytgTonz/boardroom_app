# Socket.IO Real-time Features Guide

## Overview
Socket.IO has been successfully integrated into the Boardroom Booking App to provide real-time updates for booking operations.

## Features Implemented

### Backend (Server-side)
- **Socket.IO Server**: Configured with CORS support
- **Room Management**: Users can join/leave rooms for targeted updates
- **Real-time Events**: Automatically emitted when bookings are:
  - Created (`booking-created`)
  - Updated (`booking-updated`)
  - Cancelled (`booking-cancelled`)
  - Deleted (`booking-deleted`)

### Frontend (Client-side)
- **Socket Service**: Singleton service for connection management
- **useSocket Hook**: React hook for easy Socket.IO integration
- **Real-time Updates**: Calendar and Dashboard automatically update
- **Connection Status**: Visual indicators show live connection status
- **Toast Notifications**: User-friendly notifications for booking changes

## How It Works

### 1. Server Events
When a booking operation occurs, the server emits events with this structure:
```javascript
{
  booking: {...}, // Full booking object with populated fields
  boardroomId: "room_id",
  changes: { // For updates only
    boardroomChanged: boolean,
    timeChanged: boolean,
    attendeesChanged: boolean
  },
  cancelledBy: "admin" | "user", // For cancellations
  deletedBy: "admin" | "user"    // For deletions
}
```

### 2. Client Integration
Components automatically receive and handle these events:
- **CalendarView**: Updates calendar events in real-time
- **Dashboard**: Shows connection status
- **Toast Notifications**: Inform users of changes

### 3. Connection Management
- Auto-reconnection with exponential backoff
- Connection status indicators
- Error handling and user feedback

## Usage Examples

### Basic Hook Usage
```tsx
import { useSocket } from '../hooks/useSocket';

const MyComponent = () => {
  const { isConnected, socket } = useSocket({
    autoConnect: true,
    rooms: ['bookings'],
    onBookingCreated: (data) => {
      console.log('New booking:', data.booking);
      // Update UI state
    }
  });
  
  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
};
```

### Manual Socket Operations
```tsx
import { socketService } from '../services/socket';

// Connect manually
const socket = socketService.connect();

// Join specific room
socketService.joinRoom('boardroom-123');

// Listen for events
socketService.onBookingCreated((data) => {
  // Handle new booking
});

// Cleanup
socketService.removeAllBookingListeners();
socketService.disconnect();
```

## Testing the Integration

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Check Connection Status
- Look for the green "Live Updates" indicator in Dashboard and Calendar
- Check browser console for connection messages

### 3. Test Real-time Updates
1. Open the app in multiple browser tabs/windows
2. Create, update, or cancel a booking in one tab
3. Observe real-time updates in other tabs
4. Check toast notifications

### 4. Monitor Server Logs
Server will show:
- Socket.IO connection/disconnection messages
- Event emission logs
- Room join/leave activities

## Environment Configuration

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```
CORS_ORIGIN=http://localhost:3000
```

## Deployment Considerations

### Production Setup
1. Update CORS_ORIGIN to production frontend URL
2. Update VITE_API_URL to production backend URL
3. Configure proper SSL certificates for WebSocket connections
4. Consider using Redis adapter for multi-server deployments

### Performance
- Events are only emitted to relevant rooms
- Connection pooling handles multiple clients efficiently
- Auto-cleanup prevents memory leaks

## Troubleshooting

### Common Issues
1. **Connection Fails**: Check CORS configuration and URLs
2. **Events Not Received**: Verify room membership and event listeners
3. **Multiple Connections**: Ensure proper cleanup in useEffect

### Debug Mode
Enable Socket.IO debugging:
```javascript
localStorage.debug = 'socket.io-client:socket';
```

## Future Enhancements
- User-specific notifications
- Typing indicators for collaborative editing
- Real-time occupancy status
- Push notifications for mobile devices

## DevOps Mentoring Note
This implementation demonstrates:
- **Microservices Communication**: Real-time event-driven architecture
- **Scalability**: Room-based event targeting
- **Error Handling**: Graceful degradation and reconnection
- **User Experience**: Non-blocking updates with visual feedback
- **Monitoring**: Connection status and event logging