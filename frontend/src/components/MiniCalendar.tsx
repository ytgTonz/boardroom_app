import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';

interface MiniCalendarProps {
  onDateClick?: (date: Date) => void;
  className?: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ onDateClick, className = '' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const bookings = await bookingsAPI.getCalendarBookings(
          startOfMonth.toISOString(),
          endOfMonth.toISOString()
        );
        setBookingsData(bookings);
      } catch (error) {
        console.error('Error fetching bookings for mini calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getBookingsForDate = (date: Date) => {
    if (!date) return [];
    
    const dateStr = date.toDateString();
    return bookingsData.filter(booking => 
      new Date(booking.startTime).toDateString() === dateStr
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setLoading(true);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentDate.getMonth();
  };

  const handleDateClick = (date: Date | null) => {
    if (date && onDateClick) {
      onDateClick(date);
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const bookings = getBookingsForDate(date);
          const hasBookings = bookings.length > 0;
          const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
          
          return (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              className={`
                relative h-8 flex items-center justify-center text-sm cursor-pointer rounded transition-colors
                ${date ? 'hover:bg-gray-100' : ''}
                ${isToday(date) ? 'bg-blue-100 text-blue-900 font-semibold' : ''}
                ${date && !isCurrentMonth(date) ? 'text-gray-300' : 'text-gray-700'}
                ${date && isCurrentMonth(date) && !isToday(date) ? 'hover:bg-gray-50' : ''}
              `}
            >
              {date && (
                <>
                  <span className="relative z-10">{date.getDate()}</span>
                  {hasBookings && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                      {confirmedBookings > 0 && (
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      )}
                      {bookings.some(b => b.status === 'cancelled') && (
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>
        {loading && (
          <div className="text-center mt-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniCalendar;