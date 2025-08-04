import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardroomsAPI, bookingsAPI, usersAPI } from '../services/api';
import { Boardroom, BookingFormData, User, AttendeeOption, Booking } from '../types';
import { toast } from 'react-toastify';
import Select from 'react-select';

interface EditBookingFormProps {
  booking: Booking;
  onCancel: () => void;
  onUpdate: (updatedBooking: Booking) => void;
}

const EditBookingForm: React.FC<EditBookingFormProps> = ({ booking, onCancel, onUpdate }) => {
  const navigate = useNavigate();
  const [boardrooms, setBoardrooms] = useState<Boardroom[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [externalEmail, setExternalEmail] = useState('');

  // Helper function to convert UTC date to local datetime-local format
  const toLocalDateTimeString = (utcDateString: string) => {
    const date = new Date(utcDateString);
    // Get local time offset and adjust for it
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Initialize form data from existing booking
  const [formData, setFormData] = useState<BookingFormData>({
    boardroom: booking.boardroom._id,
    startTime: toLocalDateTimeString(booking.startTime),
    endTime: toLocalDateTimeString(booking.endTime),
    purpose: booking.purpose,
    attendees: booking.attendees.map(user => ({
      type: 'user' as const,
      value: user._id,
      label: `${user.name} (${user.email})`,
      email: user.email
    })),
    notes: booking.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [boardroomsData, usersData] = await Promise.all([
          boardroomsAPI.getAll(),
          usersAPI.getAll()
        ]);
        
        setBoardrooms(boardroomsData.filter((room: Boardroom) => room.isActive));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.boardroom) {
      newErrors.boardroom = 'Please select a boardroom';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Please select a start time';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Please select an end time';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start >= end) {
        newErrors.endTime = 'End time must be after start time';
      }

      if (start < new Date()) {
        newErrors.startTime = 'Start time cannot be in the past';
      }
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Please enter a purpose for the meeting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Convert datetime-local to ISO string for backend
      const startTimeISO = new Date(formData.startTime).toISOString();
      const endTimeISO = new Date(formData.endTime).toISOString();
      
      console.log('Edit form sending times:', { 
        original: { start: formData.startTime, end: formData.endTime },
        iso: { start: startTimeISO, end: endTimeISO }
      });
      
      // Transform attendees data for backend
      const updateData = {
        ...formData,
        startTime: startTimeISO,
        endTime: endTimeISO,
        attendees: {
          users: formData.attendees.filter(a => a.type === 'user').map(a => a.value),
          external: formData.attendees.filter(a => a.type === 'external').map(a => a.email!)
        }
      };
      
      const updatedBooking = await bookingsAPI.update(booking._id, updateData);
      toast.success('Booking updated successfully!');
      onUpdate(updatedBooking);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const attendeeOptions = users.map(user => ({ 
    type: 'user' as const,
    value: user._id, 
    label: `${user.name} (${user.email})`,
    email: user.email
  }));

  const addExternalEmail = () => {
    if (!externalEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(externalEmail)) {
      setErrors(prev => ({ ...prev, externalEmail: 'Please enter a valid email address' }));
      return;
    }

    const emailExists = formData.attendees.some(attendee => 
      attendee.email === externalEmail || 
      (attendee.type === 'external' && attendee.value === externalEmail)
    );
    
    if (emailExists) {
      setErrors(prev => ({ ...prev, externalEmail: 'This email is already added' }));
      return;
    }

    const newAttendee: AttendeeOption = {
      type: 'external',
      value: externalEmail,
      label: externalEmail,
      email: externalEmail
    };

    setFormData(prev => ({ 
      ...prev, 
      attendees: [...prev.attendees, newAttendee] 
    }));
    setExternalEmail('');
    if (errors.externalEmail) {
      setErrors(prev => ({ ...prev, externalEmail: '' }));
    }
  };

  const removeAttendee = (attendeeToRemove: AttendeeOption) => {
    setFormData(prev => ({ 
      ...prev, 
      attendees: prev.attendees.filter(attendee => attendee.value !== attendeeToRemove.value) 
    }));
  };

  const getSelectedBoardroom = () => {
    return boardrooms.find(room => room._id === formData.boardroom);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Booking</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Boardroom Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Boardroom *
          </label>
          <select
            value={formData.boardroom}
            onChange={(e) => handleInputChange('boardroom', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.boardroom ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a boardroom...</option>
            {boardrooms.map((boardroom) => (
              <option key={boardroom._id} value={boardroom._id}>
                {boardroom.name} - {boardroom.location} (Capacity: {boardroom.capacity})
              </option>
            ))}
          </select>
          {errors.boardroom && (
            <p className="mt-1 text-sm text-red-600">{errors.boardroom}</p>
          )}
        </div>

        {/* Selected Boardroom Details */}
        {getSelectedBoardroom() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              {getSelectedBoardroom()?.name}
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              {getSelectedBoardroom()?.location} • Capacity: {getSelectedBoardroom()?.capacity} people
            </p>
            {getSelectedBoardroom()?.amenities && getSelectedBoardroom()!.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {getSelectedBoardroom()!.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date and Time Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.startTime ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              min={formData.startTime}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.endTime ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Meeting Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Purpose *
            </label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="e.g., Team Meeting, Client Presentation, Training Session"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.purpose ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.purpose && (
              <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
            )}
          </div>

          {/* Attendees Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendees
            </label>
            <Select
              isMulti
              options={attendeeOptions}
              value={formData.attendees.filter(attendee => attendee.type === 'user')}
              onChange={(selected) => {
                const userAttendees = selected || [];
                const externalAttendees = formData.attendees.filter(attendee => attendee.type === 'external');
                setFormData(prev => ({ ...prev, attendees: [...userAttendees, ...externalAttendees] }));
              }}
              classNamePrefix="react-select"
              placeholder="Select registered users..."
            />
            
            {/* External Email Input */}
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  placeholder="Add external email..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExternalEmail();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addExternalEmail}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Add
                </button>
              </div>
              {errors.externalEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.externalEmail}</p>
              )}
            </div>
            
            {/* Selected Attendees Display */}
            {formData.attendees.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Attendees:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.attendees.map((attendee, index) => (
                    <span
                      key={`${attendee.type}-${attendee.value}-${index}`}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        attendee.type === 'user' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {attendee.type === 'external' && (
                        <span className="mr-1">📧</span>
                      )}
                      {attendee.label}
                      <button
                        type="button"
                        onClick={() => removeAttendee(attendee)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {errors.attendees && (
              <p className="mt-1 text-sm text-red-600">{errors.attendees}</p>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any special requirements, equipment needed, or additional information..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Update Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBookingForm;