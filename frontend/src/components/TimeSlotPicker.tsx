import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TimeSlot, DetailedAvailability } from '../types';
import { bookingsAPI } from '../services/api';

interface TimeSlotPickerProps {
  boardroomId: string;
  selectedDate: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  boardroomId,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  onTimeSlotSelect,
  onError,
  disabled = false
}) => {
  const [availability, setAvailability] = useState<DetailedAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (boardroomId && selectedDate) {
      fetchAvailability();
    }
  }, [boardroomId, selectedDate]);

  useEffect(() => {
    // Reset selection when props change
    setSelectedSlots([]);
    setIsSelecting(false);
  }, [selectedStartTime, selectedEndTime, boardroomId, selectedDate]);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingsAPI.getDetailedAvailability(boardroomId, selectedDate);
      setAvailability(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load availability';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSlotSelected = (slot: TimeSlot) => {
    return selectedSlots.some(selected => selected.startTime === slot.startTime);
  };

  const areConsecutiveSlots = (slot1: TimeSlot, slot2: TimeSlot) => {
    return new Date(slot1.endTime).getTime() === new Date(slot2.startTime).getTime();
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (disabled || !slot.available) return;

    if (!isSelecting) {
      // Start selecting
      setSelectedSlots([slot]);
      setIsSelecting(true);
    } else {
      // Continue or finish selecting
      const lastSlot = selectedSlots[selectedSlots.length - 1];
      
      if (areConsecutiveSlots(lastSlot, slot)) {
        // Add consecutive slot - allow unlimited selection
        const newSelection = [...selectedSlots, slot];
        setSelectedSlots(newSelection);
      } else if (slot.startTime === selectedSlots[0].startTime) {
        // Clicked same starting slot - finish selection
        const startTime = selectedSlots[0].startTime;
        const endTime = selectedSlots[selectedSlots.length - 1].endTime;
        onTimeSlotSelect(startTime, endTime);
        setIsSelecting(false);
      } else {
        // Start new selection
        setSelectedSlots([slot]);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedSlots([]);
    setIsSelecting(false);
  };

  const getSlotClassName = (slot: TimeSlot) => {
    const baseClasses = 'p-3 border rounded-lg cursor-pointer transition-all duration-200 text-sm';
    
    if (disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed bg-gray-100 border-gray-200`;
    }

    if (!slot.available) {
      return `${baseClasses} bg-red-50 border-red-200 text-red-700 cursor-not-allowed hover:bg-red-100`;
    }

    if (isSlotSelected(slot)) {
      return `${baseClasses} bg-blue-100 border-blue-400 text-blue-800 shadow-md transform scale-105`;
    }

    return `${baseClasses} bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-300 hover:shadow-sm`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchAvailability}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Available Time Slots
          </h3>
          <p className="text-sm text-gray-600">
            {formatDate(selectedDate)} • {availability.boardroom.name}
          </p>
        </div>
        {isSelecting && selectedSlots.length > 0 && (
          <button
            onClick={handleClearSelection}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start">
          <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">How to select time:</p>
            <p>Click on a green (available) slot to start, then click consecutive slots to extend your booking. Click "Confirm Selection" when ready. Minimum 30 minutes required.</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
          <span className="text-gray-700">Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
          <span className="text-gray-700">Booked</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded mr-2"></div>
          <span className="text-gray-700">Selected</span>
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        {availability.timeSlots.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No available time slots for this date</p>
            <p className="text-sm text-gray-500 mt-1">Try selecting a different date</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {availability.timeSlots.map((slot, index) => (
              <div
                key={index}
                className={getSlotClassName(slot)}
                onClick={() => handleSlotClick(slot)}
                title={
                  !slot.available && slot.conflictingBooking
                    ? `Booked: ${slot.conflictingBooking.purpose} by ${slot.conflictingBooking.organizer}`
                    : slot.available
                    ? 'Click to select this time slot'
                    : 'This time slot is not available'
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {formatTime(slot.startTime)}
                  </span>
                  {slot.available ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                </div>
                <div className="text-xs opacity-75">
                  30 min slot
                </div>
                {!slot.available && slot.conflictingBooking && (
                  <div className="mt-1 text-xs opacity-90 truncate">
                    {slot.conflictingBooking.purpose}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {selectedSlots.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Selected Time:</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-blue-800">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                {formatTime(selectedSlots[0].startTime)} - {formatTime(selectedSlots[selectedSlots.length - 1].endTime)}
              </span>
              <span className="ml-2 text-sm opacity-75">
                ({selectedSlots.length * 30} minutes)
              </span>
            </div>
            {isSelecting && (
              <button
                onClick={() => {
                  const startTime = selectedSlots[0].startTime;
                  const endTime = selectedSlots[selectedSlots.length - 1].endTime;
                  onTimeSlotSelect(startTime, endTime);
                  setIsSelecting(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Confirm Selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {availability.totalBookings > 0 && (
        <div className="text-center text-sm text-gray-500">
          {availability.totalBookings} booking(s) on this date
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker;