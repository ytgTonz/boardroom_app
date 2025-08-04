import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import EditBookingForm from './EditBookingForm';

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    const fetchBookings = async () => {
      try {
        const data = await bookingsAPI.getMyBookings();
        setBookings(data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [user]);

  // Fixed cancel booking function to use the correct API method
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      // Use the cancel method instead of delete
      await bookingsAPI.cancel(bookingId);
      // Refresh bookings
      const updatedBookings = await bookingsAPI.getMyBookings();
      setBookings(updatedBookings);
      alert('Booking cancelled successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking');
    }
  };

  const handleOptOut = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to opt out of this meeting?')) return;
    try {
      await bookingsAPI.optOut(bookingId);
      // Refresh bookings
      const updatedBookings = await bookingsAPI.getMyBookings();
      setBookings(updatedBookings);
      alert('You have opted out of this meeting.');
    } catch (error: any) {
      alert(error.message || 'Failed to opt out');
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
  };

  const handleCancelEdit = () => {
    setEditingBooking(null);
  };

  const handleUpdateBooking = async (updatedBooking: Booking) => {
    // Update the booking in the local state
    const updatedBookings = bookings.map(booking => 
      booking._id === updatedBooking._id ? updatedBooking : booking
    );
    setBookings(updatedBookings);
    setEditingBooking(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isBookingPast = (startTime: string) => {
    return new Date(startTime) < new Date();
  };

  const isBookingUpcoming = (startTime: string) => {
    const now = new Date();
    const bookingTime = new Date(startTime);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return bookingTime > now && bookingTime <= oneHourFromNow;
  };

  // Helper function to check if booking was recently modified (within last 10 seconds)
  const isBookingRecentlyModified = (booking: Booking) => {
    if (!booking.modifiedAt) return false;
    const now = new Date();
    const modifiedTime = new Date(booking.modifiedAt);
    const timeDiff = now.getTime() - modifiedTime.getTime();
    const tenSecondsInMs = 10 * 1000; // 10 seconds
    return timeDiff <= tenSecondsInMs && booking.modifiedAt !== booking.createdAt;
  };

  // Helper functions to determine user's relationship to booking
  const isUserCreator = (booking: Booking) => {
    let truthi = booking.user._id === user?._id;
    console.log(booking.user._id)
    console.log(user?._id)
    console.log(truthi);
    return truthi;
  };

  const isUserAttendee = (booking: Booking) => {
    return booking.attendees && 
           Array.isArray(booking.attendees) && 
           booking.attendees.some(attendee => attendee._id === user?._id);
  };

  const shouldShowCancelButton = (booking: Booking) => {
    return booking.status === 'confirmed' && 
           !isBookingPast(booking.startTime) && 
           isUserCreator(booking);
  };

  const shouldShowOptOutButton = (booking: Booking) => {
    return booking.status === 'confirmed' && 
           !isBookingPast(booking.startTime) && 
           isUserAttendee(booking) && 
           !isUserCreator(booking);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-gray-600">
              Manage your boardroom reservations and view booking history.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4">
            <button
              onClick={() => navigate('/book')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book New Room
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {filteredBookings.length} Booking{filteredBookings.length !== 1 ? 's' : ''}
          </h2>
          <div className="text-sm text-gray-500">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {bookings.length === 0 
                ? "You haven't made any bookings yet." 
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className={`border rounded-lg p-6 transition-all duration-300 ${
                isBookingRecentlyModified(booking) 
                  ? 'border-orange-300 bg-orange-50 shadow-md ring-2 ring-orange-200' 
                  : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.purpose}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      {isBookingUpcoming(booking.startTime) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Upcoming
                        </span>
                      )}
                      {isBookingPast(booking.startTime) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          Complete
                        </span>
                      )}
                      {/* Add indicator to show user's role */}
                      {isUserCreator(booking) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          Created by you
                        </span>
                      )}
                      {/* Show "Added by" tag when user is attendee but not creator */}
                      {isUserAttendee(booking) && !isUserCreator(booking) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Added by {booking.user.name}
                        </span>
                      )}
                      {/* Show "Recently Modified" tag for modified bookings */}
                      {isBookingRecentlyModified(booking) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 animate-pulse">
                          Recently Modified
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{booking.boardroom.name}</span> • {booking.boardroom.location}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDate(booking.startTime)} - {formatDate(booking.endTime)}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Attendees:
                      {booking.attendees && Array.isArray(booking.attendees) && booking.attendees.length > 0 ? (
                        <span className="ml-2 flex flex-wrap gap-1">
                          {booking.attendees.map((attendee) => (
                            <span
                              key={attendee._id}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                attendee._id === user?._id 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                              title={attendee.email}
                            >
                              {attendee.name}
                              {attendee._id === user?._id && ' (You)'}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="ml-2 text-gray-400">None</span>
                      )}
                      {booking.notes && (
                        <span className="ml-2 text-gray-600">
                          • {booking.notes}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Action Buttons - Improved logic */}    
                  <div className="flex items-center space-x-2">
                    {/* Show Edit if user is the creator and booking is confirmed and not in the past */}
                    {isUserCreator(booking) && booking.status === 'confirmed' && !isBookingPast(booking.startTime) && (
                      <button
                        onClick={() => handleEditBooking(booking)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {/* Show Cancel if user is the creator */}
                    {shouldShowCancelButton(booking) && (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}
                    
                    {/* Show Opt Out if user is attendee but not creator */}
                    {shouldShowOptOutButton(booking) && (
                      <button
                        onClick={() => handleOptOut(booking._id)}
                        className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors"
                      >
                        Opt Out
                      </button>
                    )}
                  </div>
                </div>

                {/* Amenities */}
                {booking.boardroom.amenities && booking.boardroom.amenities.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Room Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {booking.boardroom.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Booking Modal/Form */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EditBookingForm
              booking={editingBooking}
              onCancel={handleCancelEdit}
              onUpdate={handleUpdateBooking}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;