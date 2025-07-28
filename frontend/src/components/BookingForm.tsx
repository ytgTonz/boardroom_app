import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { boardroomsAPI, bookingsAPI, usersAPI } from '../services/api';
import { Boardroom, BookingFormData, User } from '../types';
import { toast } from 'react-toastify';
import Select from 'react-select';

const BookingForm: React.FC = () => {
  const location = useLocation();
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);

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

  // Set minimum date to today
  const getMinDate = () => {
    const today = new Date();
    today.setHours(today.getHours() + 1); // Minimum 1 hour from now
    return today.toISOString().slice(0, 16);
  };

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
      await bookingsAPI.create(formData);
      toast.success('Booking created successfully!');
      
      // Reset form
      setFormData({
        boardroom: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: [],
        notes: ''
      });
      setSelectedBoardroom('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
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

  const attendeeOptions = users.map(user => ({ value: user._id, label: `${user.name} (${user.email})` }));

  const handleAttendeesChange = (selected: any) => {
    setFormData(prev => ({ ...prev, attendees: selected ? selected.map((opt: any) => opt.value) : [] }));
    if (errors.attendees) {
      setErrors(prev => ({ ...prev, attendees: '' }));
    }
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
                min={getMinDate()}
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
                min={formData.startTime || getMinDate()}
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
                value={attendeeOptions.filter(opt => formData.attendees.includes(opt.value))}
                onChange={handleAttendeesChange}
                classNamePrefix="react-select"
                placeholder="Select attendees..."
              />
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