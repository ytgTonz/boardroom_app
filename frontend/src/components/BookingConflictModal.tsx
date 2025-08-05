import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, MapPin, Users, Calendar } from 'lucide-react';
import { Booking, Boardroom } from '../types';
import { bookingsAPI, boardroomsAPI } from '../services/api';
import moment from 'moment';

interface ConflictingBooking extends Booking {
  boardroom: Boardroom;
}

interface BookingConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: {
    requestedTime: {
      startTime: string;
      endTime: string;
    };
    boardroomId: string;
    conflictingBookings: ConflictingBooking[];
  } | null;
  onResolve: (resolution: ConflictResolution) => void;
}

interface ConflictResolution {
  action: 'modify_time' | 'change_room' | 'force_book' | 'cancel';
  newStartTime?: string;
  newEndTime?: string;
  newBoardroomId?: string;
}

interface AlternativeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface AlternativeBoardroom {
  boardroom: Boardroom;
  isAvailable: boolean;
  nextAvailableSlot?: AlternativeSlot;
}

const BookingConflictModal: React.FC<BookingConflictModalProps> = ({
  isOpen,
  onClose,
  conflictData,
  onResolve
}) => {
  const [loading, setLoading] = useState(false);
  const [alternativeTimes, setAlternativeTimes] = useState<AlternativeSlot[]>([]);
  const [alternativeRooms, setAlternativeRooms] = useState<AlternativeBoardroom[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);

  useEffect(() => {
    if (isOpen && conflictData) {
      fetchAlternatives();
    }
  }, [isOpen, conflictData]);

  const fetchAlternatives = async () => {
    if (!conflictData) return;
    
    setLoading(true);
    try {
      // Fetch alternative time slots for the same room
      const timeAlternatives = await generateAlternativeTimeSlots();
      setAlternativeTimes(timeAlternatives);

      // Fetch alternative rooms for the same time
      const roomAlternatives = await fetchAlternativeRooms();
      setAlternativeRooms(roomAlternatives);
    } catch (error) {
      console.error('Error fetching alternatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlternativeTimeSlots = async (): Promise<AlternativeSlot[]> => {
    if (!conflictData) return [];
    
    const { requestedTime, boardroomId } = conflictData;
    const requestedStart = moment(requestedTime.startTime);
    const requestedEnd = moment(requestedTime.endTime);
    const duration = requestedEnd.diff(requestedStart, 'minutes');
    
    const alternatives: AlternativeSlot[] = [];
    const today = moment().startOf('day');
    
    // Generate alternative slots for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDay = today.clone().add(day, 'days');
      
      // Working hours: 7:00 AM to 4:00 PM
      for (let hour = 7; hour < 16; hour++) {
        const slotStart = currentDay.clone().hour(hour).minute(0);
        const slotEnd = slotStart.clone().add(duration, 'minutes');
        
        // Skip if slot extends beyond working hours
        if (slotEnd.hour() > 16 || (slotEnd.hour() === 16 && slotEnd.minute() > 0)) {
          continue;
        }
        
        // Skip if slot is in the past
        if (slotStart.isBefore(moment())) {
          continue;
        }
        
        // Skip the originally requested time
        if (slotStart.isSame(requestedStart) && slotEnd.isSame(requestedEnd)) {
          continue;
        }
        
        try {
          // Check availability
          const availability = await bookingsAPI.checkAvailability(
            boardroomId,
            slotStart.toISOString(),
            slotEnd.toISOString()
          );
          
          alternatives.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: availability.available
          });
          
          // Limit to first 10 alternatives
          if (alternatives.length >= 10) break;
        } catch (error) {
          console.error('Error checking availability for slot:', error);
        }
      }
      
      if (alternatives.length >= 10) break;
    }
    
    // Sort by availability first, then by time
    return alternatives
      .sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return moment(a.startTime).diff(moment(b.startTime));
      })
      .slice(0, 8); // Limit to 8 alternatives
  };

  const fetchAlternativeRooms = async (): Promise<AlternativeBoardroom[]> => {
    if (!conflictData) return [];
    
    try {
      const allRooms = await boardroomsAPI.getAll();
      const alternatives: AlternativeBoardroom[] = [];
      
      for (const room of allRooms) {
        if (room._id === conflictData.boardroomId || !room.isActive) continue;
        
        try {
          const availability = await bookingsAPI.checkAvailability(
            room._id,
            conflictData.requestedTime.startTime,
            conflictData.requestedTime.endTime
          );
          
          let nextAvailableSlot: AlternativeSlot | undefined;
          
          if (!availability.available) {
            // Find next available slot for this room
            const duration = moment(conflictData.requestedTime.endTime).diff(
              moment(conflictData.requestedTime.startTime), 
              'minutes'
            );
            
            // Try to find next available slot within 2 days
            for (let hour = 7; hour < 16; hour++) {
              const tomorrow = moment().add(1, 'day').hour(hour).minute(0);
              const tomorrowEnd = tomorrow.clone().add(duration, 'minutes');
              
              if (tomorrowEnd.hour() > 16) continue;
              
              try {
                const nextAvailability = await bookingsAPI.checkAvailability(
                  room._id,
                  tomorrow.toISOString(),
                  tomorrowEnd.toISOString()
                );
                
                if (nextAvailability.available) {
                  nextAvailableSlot = {
                    startTime: tomorrow.toISOString(),
                    endTime: tomorrowEnd.toISOString(),
                    available: true
                  };
                  break;
                }
              } catch (error) {
                console.error('Error checking next slot:', error);
              }
            }
          }
          
          alternatives.push({
            boardroom: room,
            isAvailable: availability.available,
            nextAvailableSlot
          });
        } catch (error) {
          console.error('Error checking room availability:', error);
        }
      }
      
      // Sort available rooms first
      return alternatives.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return a.boardroom.name.localeCompare(b.boardroom.name);
      }).slice(0, 6); // Limit to 6 alternatives
    } catch (error) {
      console.error('Error fetching alternative rooms:', error);
      return [];
    }
  };

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
      onClose();
    }
  };

  const formatTime = (dateString: string) => {
    return moment(dateString).format('MMM DD, YYYY [at] HH:mm');
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const duration = moment(endTime).diff(moment(startTime), 'minutes');
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!isOpen || !conflictData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Booking Conflict Detected</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Conflict Information */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-900 mb-2">Conflicting Bookings Found</h3>
            <p className="text-sm text-red-700 mb-3">
              Your requested time conflicts with {conflictData.conflictingBookings.length} existing booking(s):
            </p>
            
            <div className="space-y-2">
              {conflictData.conflictingBookings.map((booking, index) => (
                <div key={booking._id} className="bg-white border border-red-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{booking.purpose}</p>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        <span className="mx-2">•</span>
                        <Users className="w-4 h-4 mr-1" />
                        Booked by {booking.user.name}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      Conflicts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Choose a Resolution</h3>

            {/* Option 1: Modify Time */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="radio"
                  id="modify_time"
                  name="resolution"
                  checked={selectedResolution?.action === 'modify_time'}
                  onChange={() => setSelectedResolution({ action: 'modify_time' })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="modify_time" className="ml-2 font-medium text-gray-900">
                  Change Time (Same Room)
                </label>
              </div>
              
              {alternativeTimes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                  {alternativeTimes.slice(0, 6).map((slot, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedResolution?.action === 'modify_time' &&
                        selectedResolution?.newStartTime === slot.startTime
                          ? 'border-blue-500 bg-blue-50'
                          : slot.available
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (slot.available) {
                          setSelectedResolution({
                            action: 'modify_time',
                            newStartTime: slot.startTime,
                            newEndTime: slot.endTime
                          });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(slot.startTime)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Duration: {formatDuration(slot.startTime, slot.endTime)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          slot.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {slot.available ? 'Available' : 'Conflict'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 ml-6">
                  {loading ? 'Loading alternative times...' : 'No alternative times available'}
                </p>
              )}
            </div>

            {/* Option 2: Change Room */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <input
                  type="radio"
                  id="change_room"
                  name="resolution"
                  checked={selectedResolution?.action === 'change_room'}
                  onChange={() => setSelectedResolution({ action: 'change_room' })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="change_room" className="ml-2 font-medium text-gray-900">
                  Change Room (Same Time)
                </label>
              </div>
              
              {alternativeRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                  {alternativeRooms.map((room, index) => (
                    <div
                      key={room.boardroom._id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedResolution?.action === 'change_room' &&
                        selectedResolution?.newBoardroomId === room.boardroom._id
                          ? 'border-blue-500 bg-blue-50'
                          : room.isAvailable
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => {
                        if (room.isAvailable) {
                          setSelectedResolution({
                            action: 'change_room',
                            newBoardroomId: room.boardroom._id
                          });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{room.boardroom.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          room.isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {room.isAvailable ? 'Available' : 'Conflict'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {room.boardroom.location}
                        <span className="mx-2">•</span>
                        <Users className="w-4 h-4 mr-1" />
                        {room.boardroom.capacity} people
                      </div>
                      {!room.isAvailable && room.nextAvailableSlot && (
                        <p className="text-xs text-gray-500 mt-1">
                          Next available: {formatTime(room.nextAvailableSlot.startTime)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 ml-6">
                  {loading ? 'Loading alternative rooms...' : 'No alternative rooms available'}
                </p>
              )}
            </div>

            {/* Option 3: Cancel */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="cancel"
                  name="resolution"
                  checked={selectedResolution?.action === 'cancel'}
                  onChange={() => setSelectedResolution({ action: 'cancel' })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="cancel" className="ml-2 font-medium text-gray-900">
                  Cancel Booking Request
                </label>
                <p className="ml-2 text-sm text-gray-600">
                  I'll choose a different time manually
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedResolution || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Apply Resolution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConflictModal;