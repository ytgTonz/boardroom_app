import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CloudOff, Wifi, Calendar, Clock, Users, FileText } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { pwaStorage, backgroundSync } from '../utils/pwaUtils';
import { useFormValidation, validationRules } from '../hooks/useFormValidation';
import FormField from './FormField';

interface OfflineBookingFormProps {
  onBookingCreated?: (bookingId: string) => void;
  className?: string;
}

const OfflineBookingForm: React.FC<OfflineBookingFormProps> = ({ 
  onBookingCreated, 
  className = '' 
}) => {
  const { isOnline } = usePWA();
  const [cachedBoardrooms, setCachedBoardrooms] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    values,
    errors,
    isValid,
    getFieldProps,
    getFieldError,
    validateForm,
    resetForm
  } = useFormValidation({
    boardroom: {
      ...validationRules.required('Please select a boardroom')
    },
    startTime: {
      ...validationRules.required('Start time is required'),
      custom: (value: string) => {
        const startDate = new Date(value);
        const now = new Date();
        if (startDate <= now) {
          return 'Start time must be in the future';
        }
        return null;
      }
    },
    endTime: {
      ...validationRules.required('End time is required'),
      custom: (value: string) => {
        const startTime = values.startTime;
        if (!startTime || !value) return null;
        
        const startDate = new Date(startTime);
        const endDate = new Date(value);
        
        if (endDate <= startDate) {
          return 'End time must be after start time';
        }
        
        const diffMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
        if (diffMinutes < 30) {
          return 'Booking must be at least 30 minutes long';
        }
        
        return null;
      }
    },
    purpose: {
      ...validationRules.required('Purpose is required'),
      ...validationRules.minLength(5, 'Purpose must be at least 5 characters')
    }
  });

  useEffect(() => {
    const loadCachedBoardrooms = async () => {
      try {
        const cached = await pwaStorage.getCachedBoardrooms();
        setCachedBoardrooms(cached);
      } catch (error) {
        console.error('Failed to load cached boardrooms:', error);
      }
    };

    loadCachedBoardrooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData = {
        boardroom: values.boardroom,
        startTime: values.startTime,
        endTime: values.endTime,
        purpose: values.purpose,
        notes: values.notes || '',
        attendees: [] // Simplified for offline mode
      };

      if (isOnline) {
        // Try to create booking normally if online
        try {
          const response = await fetch('/api/bookings/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Add auth headers here
            },
            body: JSON.stringify(bookingData)
          });

          if (response.ok) {
            const result = await response.json();
            toast.success('Booking created successfully!');
            resetForm();
            onBookingCreated?.(result.id);
            return;
          }
        } catch (networkError) {
          // Fall through to offline mode
          console.warn('Network request failed, falling back to offline mode');
        }
      }

      // Save booking for offline sync
      const offlineBookingId = await pwaStorage.saveOfflineBooking(bookingData);
      
      // Request background sync
      await backgroundSync.requestSync('background-booking-sync');

      toast.success(
        isOnline 
          ? 'Booking saved! Will sync when connection improves.'
          : 'Booking saved offline! Will sync when you\'re back online.',
        {
          icon: '💾'
        }
      );

      resetForm();
      onBookingCreated?.(offlineBookingId);

    } catch (error) {
      console.error('Booking creation failed:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Status Indicator */}
      <div className={`flex items-center space-x-2 mb-4 p-3 rounded-lg ${
        isOnline 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-orange-50 border border-orange-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-green-700 text-sm font-medium">Online - Real-time booking</span>
          </>
        ) : (
          <>
            <CloudOff className="w-4 h-4 text-orange-600" />
            <span className="text-orange-700 text-sm font-medium">Offline - Booking will sync later</span>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isOnline ? 'Book a Boardroom' : 'Book a Boardroom (Offline)'}
          </h2>
        </div>

        {/* Boardroom Selection */}
        <div>
          <label htmlFor="boardroom" className="block text-sm font-medium text-gray-700 mb-2">
            Boardroom *
          </label>
          <select
            id="boardroom"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting}
            {...getFieldProps('boardroom')}
          >
            <option value="">Select a boardroom</option>
            {cachedBoardrooms.map((room) => (
              <option key={room._id || room.id} value={room._id || room.id}>
                {room.name} - Capacity: {room.capacity}
                {!isOnline && ' (Cached)'}
              </option>
            ))}
          </select>
          {getFieldError('boardroom') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('boardroom')?.message}</p>
          )}
          {!isOnline && cachedBoardrooms.length === 0 && (
            <p className="mt-1 text-sm text-orange-600">
              No cached boardrooms available. Connect to internet to load boardrooms.
            </p>
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Start Time"
            name="startTime"
            type="datetime-local"
            required
            disabled={isSubmitting}
            error={getFieldError('startTime')}
            icon={<Clock className="w-4 h-4" />}
            {...getFieldProps('startTime')}
          />

          <FormField
            label="End Time"
            name="endTime"
            type="datetime-local"
            required
            disabled={isSubmitting}
            error={getFieldError('endTime')}
            icon={<Clock className="w-4 h-4" />}
            {...getFieldProps('endTime')}
          />
        </div>

        {/* Purpose */}
        <FormField
          label="Purpose"
          name="purpose"
          type="text"
          required
          disabled={isSubmitting}
          error={getFieldError('purpose')}
          placeholder="e.g., Team standup meeting"
          helpText="Describe the purpose of your meeting"
          icon={<FileText className="w-4 h-4" />}
          {...getFieldProps('purpose')}
        />

        {/* Notes (Optional) */}
        <FormField
          label="Notes (Optional)"
          name="notes"
          type="textarea"
          disabled={isSubmitting}
          placeholder="Any additional notes or requirements..."
          rows={3}
          {...getFieldProps('notes')}
        />

        {/* Offline Mode Warning */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CloudOff className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Offline Mode</p>
                <p className="text-yellow-700 mt-1">
                  Your booking will be saved locally and synced automatically when you're back online.
                </p>
                <ul className="list-disc list-inside text-yellow-600 mt-2 space-y-1">
                  <li>Booking conflicts cannot be checked offline</li>
                  <li>Attendees cannot be added in offline mode</li>
                  <li>Confirmation will be sent once synced</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isValid || (!isOnline && cachedBoardrooms.length === 0)}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isOnline ? 'Creating Booking...' : 'Saving Offline...'}
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                {isOnline ? 'Book Room' : 'Save Booking (Offline)'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OfflineBookingForm;