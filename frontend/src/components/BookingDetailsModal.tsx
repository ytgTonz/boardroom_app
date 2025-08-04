import React from 'react';
import { X, MapPin, Clock, Users, User, Mail } from 'lucide-react';
import { Booking } from '../types';

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Purpose and Status */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">{booking.purpose}</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(booking.status)}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
            {booking.notes && (
              <p className="text-gray-600 text-sm">{booking.notes}</p>
            )}
          </div>

          {/* Room Information */}
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{booking.boardroom.name}</h4>
              <p className="text-sm text-gray-600">{booking.boardroom.location}</p>
              <p className="text-sm text-gray-600">Capacity: {booking.boardroom.capacity} people</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{formatDate(booking.startTime)}</h4>
              <p className="text-sm text-gray-600">
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </p>
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Organized by</h4>
              <p className="text-sm text-gray-600">{booking.user.name}</p>
              <p className="text-sm text-gray-500">{booking.user.email}</p>
            </div>
          </div>

          {/* Attendees */}
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-3">
                Attendees ({(booking.attendees?.length || 0) + (booking.externalAttendees?.length || 0)})
              </h4>
              
              {/* Internal Attendees */}
              {booking.attendees && booking.attendees.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h5 className="text-sm font-medium text-gray-700">Internal Attendees:</h5>
                  <div className="space-y-1">
                    {booking.attendees.map((attendee) => (
                      <div key={attendee._id} className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {attendee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attendee.name}</p>
                          <p className="text-xs text-gray-500">{attendee.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Attendees */}
              {booking.externalAttendees && booking.externalAttendees.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">External Attendees:</h5>
                  <div className="space-y-1">
                    {booking.externalAttendees.map((external, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{external.name || external.email}</p>
                          <p className="text-xs text-gray-500">{external.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!booking.attendees || booking.attendees.length === 0) && 
               (!booking.externalAttendees || booking.externalAttendees.length === 0) && (
                <p className="text-sm text-gray-500">No attendees listed</p>
              )}
            </div>
          </div>

          {/* Room Amenities */}
          {booking.boardroom.amenities && booking.boardroom.amenities.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Room Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {booking.boardroom.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Created Date */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              Created on {new Date(booking.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;