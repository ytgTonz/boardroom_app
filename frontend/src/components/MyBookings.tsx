import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import EditBookingForm from './EditBookingForm';
import { logger } from '../utils/logger';

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [previousBookingCount, setPreviousBookingCount] = useState(0);

  const { user } = useAuth();

  const fetchBookings = async (showRefreshIndicator = false, isFromNavigation = false, retryCount = 0) => {
    // Prevent concurrent fetch operations
    if (isFetching) {
      logger.booking.debug('Fetch already in progress, skipping', { action: 'fetch_bookings' });
      return false;
    }
    
    setIsFetching(true);
    if (showRefreshIndicator) setRefreshing(true);
    
    try {
      // Increased delay for better database consistency
      if (isFromNavigation) {
        logger.booking.debug('Waiting for database consistency', { 
          action: 'delay_for_consistency',
          delay: '1500ms'
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      logger.booking.debug('Fetching bookings from API', { action: 'api_call' });
      const data = await bookingsAPI.getMyBookings();
      
      // Sort bookings: upcoming first (by proximity), then completed (by proximity)
      const sortedBookings = data.sort((a, b) => {
        const now = new Date();
        const aStartTime = new Date(a.startTime);
        const bStartTime = new Date(b.startTime);
        
        const aIsUpcoming = aStartTime > now;
        const bIsUpcoming = bStartTime > now;
        
        // If one is upcoming and other is completed, upcoming comes first
        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;
        
        // If both are same type (upcoming/completed), sort by proximity
        const timeA = Math.abs(aStartTime.getTime() - now.getTime());
        const timeB = Math.abs(bStartTime.getTime() - now.getTime());
        return timeA - timeB;
      });
      
      setBookings(sortedBookings);
      
      // Check if we have a new booking (for retry logic)
      const hasNewBooking = isFromNavigation && data.length > previousBookingCount;
      logger.booking.debug('Booking count comparison', { 
        action: 'count_comparison',
        previous: previousBookingCount, 
        current: data.length, 
        hasNewBooking,
        isFromNavigation,
        retryCount 
      });
      
      // Update booking count tracking
      setPreviousBookingCount(data.length);
      
      // Retry logic if new booking not detected on first attempt
      if (isFromNavigation && !hasNewBooking && retryCount === 0 && previousBookingCount > 0) {
        logger.booking.info('New booking not detected, retrying', { 
          action: 'retry_fetch',
          retryDelay: '1000ms'
        });
        setIsFetching(false);
        if (showRefreshIndicator) setRefreshing(false);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchBookings(showRefreshIndicator, isFromNavigation, 1);
      }
      
      logger.booking.info('Fetch completed successfully', { 
        action: 'fetch_success',
        bookingCount: data.length 
      });
      return true;
    } catch (error) {
      logger.booking.error('Error fetching bookings', { 
        action: 'fetch_error',
        error: error as Error
      });
      return false;
    } finally {
      setLoading(false);
      setIsFetching(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    logger.booking.info('Initial load', { 
      action: 'initial_load',
      userId: user._id,
      userEmail: user.email 
    });
    fetchBookings();
  }, [user]);

  // Handle URL-based refresh trigger from booking creation
  useEffect(() => {
    const handleUrlRefresh = async () => {
      const shouldRefresh = searchParams.get('refresh');
      const timestamp = searchParams.get('timestamp');
      const source = searchParams.get('source');
      
      if (shouldRefresh === 'true' && user) {
        logger.booking.info('URL refresh triggered', { 
          action: 'url_refresh',
          timestamp, 
          source, 
          currentBookingCount: bookings.length 
        });
        
        // Store current booking count before refresh
        setPreviousBookingCount(bookings.length);
        
        // Fetch bookings with navigation flag
        const success = await fetchBookings(true, true);
        
        // Clear URL params after successful refresh
        if (success) {
          logger.booking.info('Refresh completed, clearing URL params', { 
            action: 'clear_url_params'
          });
          // Remove refresh params from URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('refresh');
          newSearchParams.delete('timestamp');
          newSearchParams.delete('source');
          setSearchParams(newSearchParams, { replace: true });
        } else {
          logger.booking.error('Refresh failed, keeping URL params', { 
            action: 'refresh_failed'
          });
        }
      }
    };
    
    handleUrlRefresh();
  }, [searchParams, user, setSearchParams]);

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
    return booking.user._id === user?._id;
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
          <div className="mt-4 sm:mt-0 sm:ml-4 flex space-x-3">
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
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
            {refreshing ? 'Loading...' : `${bookings.length} Booking${bookings.length !== 1 ? 's' : ''}`}
          </h2>
          {refreshing && (
            <div className="flex items-center text-sm text-blue-600">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching latest bookings...
            </div>
          )}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't made any bookings yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
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