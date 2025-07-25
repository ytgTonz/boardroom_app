import React, { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    const fetchBookings = async () => {
      try {
        const data = await bookingsAPI.getMyBookings();
        setBookings(data);
        setFilteredBookings(data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [user]);

  useEffect(() => {
    let filtered = bookings;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.startTime);
            return bookingDate.toDateString() === today.toDateString();
          });
          break;
        case 'tomorrow':
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.startTime);
            return bookingDate.toDateString() === tomorrow.toDateString();
          });
          break;
        case 'this-week':
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.startTime);
            return bookingDate >= today && bookingDate <= nextWeek;
          });
          break;
        case 'past':
          filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.startTime);
            return bookingDate < today;
          });
          break;
      }
    }

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, dateFilter]);

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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">
          Manage your boardroom reservations and view booking history.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All statuses</option>
              <option value="confirmed">Confirmed</option>
              {/* <option value="pending">Pending</option> */}
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this-week">This Week</option>
              <option value="past">Past Bookings</option>
            </select>
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
              <div key={booking._id} className="border border-gray-200 rounded-lg p-6">
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
    </div>
  );
};

export default MyBookings;