import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface CalendarWidgetProps {
  className?: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ className = '' }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDateForLoop = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForLoop));
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1);
    }
    
    return days;
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingsAPI.getAll();
      
      // Filter confirmed bookings for current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const filteredBookings = data.filter((booking: Booking) => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= startOfMonth && 
               bookingDate <= endOfMonth && 
               booking.status === 'confirmed';
      });
      
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Error fetching calendar widget bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentDate]);

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime);
      return bookingDate.toDateString() === date.toDateString();
    });
  };

  const isUserInvolved = (booking: Booking) => {
    if (!user) return false;
    return booking.user._id === user._id || 
           booking.attendees.some(attendee => attendee._id === user._id);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleViewFullCalendar = () => {
    navigate('/calendar');
  };

  const handleDateClick = (date: Date) => {
    // Navigate to full calendar with selected date
    navigate('/calendar', { state: { selectedDate: date } });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const days = generateCalendarDays();
  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
        <button
          onClick={handleViewFullCalendar}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Full Calendar →
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h4 className="font-medium text-gray-900">{monthYear}</h4>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayBookings = getBookingsForDate(date);
          const hasBookings = dayBookings.length > 0;
          const hasUserBookings = dayBookings.some(isUserInvolved);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`
                relative h-8 w-full text-xs rounded-md transition-all duration-150
                ${isCurrentMonth(date) 
                  ? 'text-gray-900 hover:bg-blue-50' 
                  : 'text-gray-400 hover:bg-gray-50'
                }
                ${isToday(date) 
                  ? 'bg-blue-100 text-blue-900 font-semibold ring-2 ring-blue-500' 
                  : ''
                }
                ${hasBookings ? 'font-medium' : ''}
              `}
              title={hasBookings 
                ? `${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''} on ${date.toLocaleDateString()}`
                : `No bookings on ${date.toLocaleDateString()}`
              }
            >
              <span className="relative z-10">{date.getDate()}</span>
              
              {/* Booking indicators */}
              {hasBookings && (
                <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                  {dayBookings.slice(0, 3).map((booking, i) => (
                    <div
                      key={booking._id}
                      className={`w-1 h-1 rounded-full ${
                        isUserInvolved(booking) 
                          ? 'bg-green-500' 
                          : 'bg-blue-400'
                      }`}
                      title={`${booking.purpose} - ${booking.boardroom.name}`}
                    />
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="w-1 h-1 rounded-full bg-gray-400" title={`+${dayBookings.length - 3} more`} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span>Other bookings</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Your bookings</span>
            </div>
          </div>
          <span className="text-gray-500">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} this month
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;