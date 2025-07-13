import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { boardroomsAPI, bookingsAPI } from '../services/api';
import { Boardroom, BookingFormData } from '../types';

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
    attendees: 1,
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    fetchBoardrooms();
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

    if (formData.attendees < 1) {
      newErrors.attendees = 'Number of attendees must be at least 1';
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
      await bookingsAPI.create(formData);
      alert('Booking created successfully!');
      
      // Reset form
      setFormData({
        boardroom: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: 1,
        notes: ''
      });
      setSelectedBoardroom('');
    } catch (error: any) {
      alert(error.message || 'Failed to create booking');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Room</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Attendees *
              </label>
              <input
                type="number"
                value={formData.attendees}
                onChange={(e) => handleInputChange('attendees', parseInt(e.target.value))}
                min="1"
                max={getSelectedBoardroom()?.capacity || 50}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.attendees ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.attendees && (
                <p className="mt-1 text-sm text-red-600">{errors.attendees}</p>
              )}
              {getSelectedBoardroom() && (
                <p className="mt-1 text-sm text-gray-500">
                  Room capacity: {getSelectedBoardroom()?.capacity} people
                </p>
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
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  boardroom: '',
                  startTime: '',
                  endTime: '',
                  purpose: '',
                  attendees: 1,
                  notes: ''
                });
                setSelectedBoardroom('');
                setErrors({});
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Clear Form
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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