import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookingDetailsModal from './BookingDetailsModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
}

interface CustomToolbarProps {
  date: Date;
  view: View;
  views: View[];
  onView: (view: View) => void;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ date, view, views, onView, onNavigate }) => {
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    onNavigate(action);
  };

  const goToToday = () => navigate('TODAY');
  const goToPrev = () => navigate('PREV');
  const goToNext = () => navigate('NEXT');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
      {/* Navigation Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={goToToday}
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Today
        </button>
        <button
          onClick={goToPrev}
          className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goToNext}
          className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Date Display */}
      <div className="text-lg font-semibold text-gray-900">
        {moment(date).format(view === 'month' ? 'MMMM YYYY' : view === 'week' ? 'MMMM DD, YYYY' : 'MMMM DD, YYYY')}
      </div>

      {/* View Toggle Buttons */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {views.map((viewName) => (
          <button
            key={viewName}
            onClick={() => onView(viewName)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              view === viewName
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBookings = useCallback(async (date: Date, view: View) => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      // Calculate date range based on current view for optimization
      switch (view) {
        case 'month':
          startDate = moment(date).startOf('month').toDate();
          endDate = moment(date).endOf('month').toDate();
          break;
        case 'week':
          startDate = moment(date).startOf('week').toDate();
          endDate = moment(date).endOf('week').toDate();
          break;
        case 'day':
          startDate = moment(date).startOf('day').toDate();
          endDate = moment(date).endOf('day').toDate();
          break;
        default:
          startDate = moment(date).subtract(1, 'month').toDate();
          endDate = moment(date).add(1, 'month').toDate();
      }

      const bookings = await bookingsAPI.getCalendarBookings(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      const calendarEvents: CalendarEvent[] = bookings.map((booking: Booking) => ({
        id: booking._id,
        title: `${booking.purpose} - ${booking.boardroom.name}`,
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
        resource: booking
      }));
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(currentDate, currentView);
  }, [currentDate, currentView, fetchBookings]);

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate: Date;
    
    switch (action) {
      case 'TODAY':
        newDate = new Date();
        break;
      case 'PREV':
        newDate = moment(currentDate).subtract(1, currentView === 'day' ? 'day' : currentView === 'week' ? 'week' : 'month').toDate();
        break;
      case 'NEXT':
        newDate = moment(currentDate).add(1, currentView === 'day' ? 'day' : currentView === 'week' ? 'week' : 'month').toDate();
        break;
      default:
        newDate = currentDate;
    }
    
    setCurrentDate(newDate);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedBooking(event.resource);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const booking = event.resource;
    let backgroundColor = '#3174ad';
    
    switch (booking.status) {
      case 'confirmed':
        backgroundColor = '#10b981';
        break;
      case 'pending':
        backgroundColor = '#f59e0b';
        break;
      case 'cancelled':
        backgroundColor = '#ef4444';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar View</h1>
        <p className="text-gray-600">
          View all boardroom bookings in calendar format.
        </p>
      </div>

      <div className="card">
        <CustomToolbar
          date={currentDate}
          view={currentView}
          views={['month', 'week', 'day']}
          onView={handleViewChange}
          onNavigate={handleNavigate}
        />
        <div className="h-96 md:h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            view={currentView}
            date={currentDate}
            onView={handleViewChange}
            onNavigate={setCurrentDate}
            onSelectEvent={handleEventClick}
            popup
            showMultiDayTimes
            step={30}
            timeslots={2}
            className="text-xs md:text-sm"
            components={{
              toolbar: () => null, // Hide default toolbar since we have custom one
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default CalendarView;