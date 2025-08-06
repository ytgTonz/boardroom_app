import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { boardroomsAPI, bookingsAPI, usersAPI } from '../services/api';
import { Boardroom, BookingFormData, User, AttendeeOption } from '../types';
import { toast } from 'react-toastify';
import Select from 'react-select';
import BookingConflictModal from './BookingConflictModal';
import TimeSlotPicker from './TimeSlotPicker';
import { errorHandlers, contextualErrorMessages } from '../utils/errorHandler';

const BookingForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [boardrooms, setBoardrooms] = useState<Boardroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardroom, setSelectedBoardroom] = useState<string>('');
  const [formData, setFormData] = useState<BookingFormData>({
    boardroom: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: [],
    notes: ''
  });
  const [externalEmail, setExternalEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchBoardrooms = async () => {
      try {
        const data = await boardroomsAPI.getAll();
        setBoardrooms(data.filter((room: Boardroom) => room.isActive));
        
        // Pre-select boardroom if passed from navigation
        if (location.state?.selectedBoardroom) {
          setFormData(prev => ({
            ...prev,
            boardroom: location.state.selectedBoardroom
          }));
          setSelectedBoardroom(location.state.selectedBoardroom);
        }
      } catch (error) {
        console.error('Error fetching boardrooms:', error);
      } finally {
        setLoading(false);
      }
    };
    const fetchUsers = async () => {
      try {
        const data = await usersAPI.getAll();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchBoardrooms();
    fetchUsers();
  }, [location.state]);


  // Check if time is within working hours (07:00 - 16:00)
  const isWithinWorkingHours = (timeString: string) => {
    if (!timeString) return false;
    const time = new Date(timeString);
    const hours = time.getHours();
    return hours >= 7 && hours < 16;
  };

  // Get next available working hour
  const getNextWorkingHour = (date: Date) => {
    const newDate = new Date(date);
    if (newDate.getHours() < 7) {
      newDate.setHours(7, 0, 0, 0);
    } else if (newDate.getHours() >= 16) {
      newDate.setDate(newDate.getDate() + 1);
      newDate.setHours(7, 0, 0, 0);
    }
    return newDate.toISOString().slice(0, 16);
  };

  const isMinimumBookingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    return diffMinutes >= 30;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.boardroom) {
      newErrors.boardroom = 'Please select a boardroom';
    }

    if (!selectedDate) {
      newErrors.date = 'Please select a date';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Please select a time slot';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Please select a time slot';
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

      // Check same day booking
      if (start.toDateString() !== end.toDateString()) {
        newErrors.endTime = 'Booking cannot span multiple days';
      }

      // Check working hours
      if (!isWithinWorkingHours(formData.startTime)) {
        newErrors.startTime = 'Start time must be between 07:00 and 16:00 (working hours)';
      }

      if (!isWithinWorkingHours(formData.endTime)) {
        newErrors.endTime = 'End time must be between 07:00 and 16:00 (working hours)';
      }

      // Check if booking spans outside working hours
      if (end.getHours() > 16 || (end.getHours() === 16 && end.getMinutes() > 0)) {
        newErrors.endTime = 'Booking must end by 16:00 (working hours)';
      }

      // Maximum booking duration (8 hours)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (durationHours > 8) {
        newErrors.endTime = 'Maximum booking duration is 8 hours';
      }
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Please enter a purpose for the meeting';
    }

    if (formData.startTime && formData.endTime && !isMinimumBookingTime(formData.startTime, formData.endTime)) {
      newErrors.startTime = 'Booking must be at least 30 minutes long';
    }

    // Attendees are now optional - no validation required

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
      // datetime-local gives us YYYY-MM-DDTHH:mm format in user's local timezone
      // We need to send it as ISO string so backend can handle timezone properly
      const startTimeISO = new Date(formData.startTime).toISOString();
      const endTimeISO = new Date(formData.endTime).toISOString();
      
      console.log('Frontend sending times:', { 
        original: { start: formData.startTime, end: formData.endTime },
        iso: { start: startTimeISO, end: endTimeISO }
      });
      
      // Transform attendees data for backend
      const bookingData = {
        ...formData,
        startTime: startTimeISO,
        endTime: endTimeISO,
        attendees: {
          users: formData.attendees.filter(a => a.type === 'user').map(a => a.value),
          external: formData.attendees.filter(a => a.type === 'external').map(a => a.email!)
        }
      };
      await bookingsAPI.create(bookingData);
      toast.success('Booking created successfully!');
      
      // Redirect to My Bookings page
      navigate('/my-bookings');
    } catch (error: any) {
      // Use enhanced error handler for better user experience
      const errorDetails = errorHandlers.booking(error, 'create', formData);
      
      // Provide specific contextual messages for common booking errors
      const serverMessage = error.response?.data?.message || '';
      let contextualMessage;
      
      if (error.response?.status === 409) {
        contextualMessage = contextualErrorMessages.booking.conflict;
      } else if (serverMessage?.includes('working hours')) {
        contextualMessage = contextualErrorMessages.booking.workingHours;
      } else if (serverMessage?.includes('minimum duration')) {
        contextualMessage = contextualErrorMessages.booking.minimumDuration;
      } else if (serverMessage?.includes('past')) {
        contextualMessage = contextualErrorMessages.booking.pastTime;
      } else if (serverMessage?.includes('boardroom') && serverMessage?.includes('unavailable')) {
        contextualMessage = contextualErrorMessages.booking.boardroomUnavailable;
      } else if (serverMessage?.includes('capacity') || serverMessage?.includes('attendees')) {
        contextualMessage = contextualErrorMessages.booking.attendeeLimit;
      } else if (serverMessage?.includes('duplicate')) {
        contextualMessage = contextualErrorMessages.booking.duplicateBooking;
      }
      
      if (contextualMessage) {
        toast.dismiss(); // Clear any existing toasts
        toast.error(contextualMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
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

  const handleAttendeesChange = (selected: any) => {
    setFormData(prev => ({ ...prev, attendees: selected || [] }));
    if (errors.attendees) {
      setErrors(prev => ({ ...prev, attendees: '' }));
    }
  };

  const addExternalEmail = () => {
    if (!externalEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(externalEmail)) {
      setErrors(prev => ({ ...prev, externalEmail: 'Please enter a valid email address' }));
      return;
    }

    // Check if email already exists
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

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Clear time selections when date changes
    setFormData(prev => ({
      ...prev,
      startTime: '',
      endTime: ''
    }));
    // Clear related errors
    setErrors(prev => ({
      ...prev,
      startTime: '',
      endTime: '',
      date: ''
    }));
  };

  const handleTimeSlotSelect = (startTime: string, endTime: string) => {
    setFormData(prev => ({
      ...prev,
      startTime,
      endTime
    }));
    // Clear time-related errors
    setErrors(prev => ({
      ...prev,
      startTime: '',
      endTime: ''
    }));
  };

  const checkTimeConflict = async (startTime: string, endTime: string) => {
    if (!formData.boardroom || !startTime || !endTime) return;
    
    try {
      const result = await bookingsAPI.checkAvailability(formData.boardroom, startTime, endTime);
      if (!result.available && result.conflictingBooking) {
        setErrors(prev => ({
          ...prev,
          startTime: `Time conflicts with "${result.conflictingBooking.purpose}" by ${result.conflictingBooking.organizer || 'another user'}`
        }));
      } else {
        // Clear conflict errors
        setErrors(prev => ({
          ...prev,
          startTime: prev.startTime?.includes('conflicts') ? '' : prev.startTime,
          endTime: prev.endTime?.includes('conflicts') ? '' : prev.endTime
        }));
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
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
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Book a Room</h1>
        <p className="text-gray-600">
          Reserve a boardroom for your meeting. Please fill in all required fields.
        </p>
      </div>

      {/* Booking Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Boardroom Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Boardroom *
            </label>
            <select
              value={formData.boardroom}
              onChange={(e) => {
                handleInputChange('boardroom', e.target.value);
                setSelectedBoardroom(e.target.value);
              }}
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
          {selectedBoardroom && getSelectedBoardroom() && (
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

          {/* Working Hours Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                <strong>Working Hours:</strong> Bookings are only allowed between 07:00 and 16:00 (4:00 PM)
              </p>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={getTodayDate()}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Time Slot Selection */}
          {formData.boardroom && selectedDate && (
            <div>
              <TimeSlotPicker
                boardroomId={formData.boardroom}
                selectedDate={selectedDate}
                selectedStartTime={formData.startTime}
                selectedEndTime={formData.endTime}
                onTimeSlotSelect={handleTimeSlotSelect}
                onError={(error) => {
                  setErrors(prev => ({ ...prev, timeSlots: error }));
                }}
                disabled={submitting}
              />
              {errors.timeSlots && (
                <p className="mt-2 text-sm text-red-600">{errors.timeSlots}</p>
              )}
              {(errors.startTime || errors.endTime) && (
                <div className="mt-2 text-sm text-red-600">
                  {errors.startTime && <p>{errors.startTime}</p>}
                  {errors.endTime && <p>{errors.endTime}</p>}
                </div>
              )}

              {/* Manual Time Input Alternative */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Or set precise times manually
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime ? new Date(formData.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                      onChange={async (e) => {
                        if (e.target.value && selectedDate) {
                          const dateTime = `${selectedDate}T${e.target.value}:00`;
                          const startTimeISO = new Date(dateTime).toISOString();
                          handleInputChange('startTime', startTimeISO);
                          
                          // Check for conflicts if end time is also set
                          if (formData.endTime) {
                            await checkTimeConflict(startTimeISO, formData.endTime);
                          }
                        }
                      }}
                      min="07:00"
                      max="16:00"
                      step="900"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime ? new Date(formData.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                      onChange={async (e) => {
                        if (e.target.value && selectedDate) {
                          const dateTime = `${selectedDate}T${e.target.value}:00`;
                          const endTimeISO = new Date(dateTime).toISOString();
                          handleInputChange('endTime', endTimeISO);
                          
                          // Check for conflicts if start time is also set
                          if (formData.startTime) {
                            await checkTimeConflict(formData.startTime, endTimeISO);
                          }
                        }
                      }}
                      min="07:00"
                      max="16:00"
                      step="900"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Set any time within working hours (07:00-16:00) in 15-minute intervals
                </p>
              </div>
            </div>
          )}

          {/* Instructions when no boardroom or date selected */}
          {(!formData.boardroom || !selectedDate) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  Please select a boardroom and date to view available time slots
                </p>
              </div>
            </div>
          )}

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

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Booking...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm; 