import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import { toast } from 'react-toastify';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer by providing the moment Object to the correct localizer.
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    booking: Booking;
    color: string;
    isUserBooking: boolean;
  };
}

interface CalendarViewProps {
  isWidget?: boolean;
  height?: number;
  onEventClick?: (booking: Booking) => void;
  userId?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  isWidget = false, 
  height = 600,
  onEventClick,
  userId 
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(isWidget ? Views.MONTH : Views.MONTH);

  // Color palette for different boardrooms
  const roomColors = [
    '#3B82F6', // Blue
    '#10B981', // Green  
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  const getRoomColor = (boardroomId: string): string => {
    // Create a simple hash of the boardroom ID to consistently assign colors
    let hash = 0;
    for (let i = 0; i < boardroomId.length; i++) {
      const char = boardroomId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return roomColors[Math.abs(hash) % roomColors.length];
  };

  const isUserBooking = (booking: Booking): boolean => {
    if (!userId) return false;
    return booking.user._id === userId || booking.attendees.some(attendee => attendee._id === userId);
  };

  // Convert bookings to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return bookings.map((booking) => ({
      id: booking._id,
      title: `${booking.purpose} (${booking.boardroom.name})`,
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      resource: {
        booking,
        color: getRoomColor(booking.boardroom._id),
        isUserBooking: isUserBooking(booking)
      }
    }));
  }, [bookings, userId]);

  const fetchBookings = async (date: Date) => {
    try {
      setLoading(true);
      
      // Calculate date range for the current view
      const startOfMonth = moment(date).startOf('month').toDate();
      const endOfMonth = moment(date).endOf('month').toDate();
      
      // For now, fetch all bookings - later we'll add date range filtering
      const data = await bookingsAPI.getAll();
      
      // Filter bookings within the current month view
      const filteredBookings = data.filter((booking: Booking) => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= startOfMonth && bookingDate <= endOfMonth && booking.status === 'confirmed';
      });
      
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Error fetching bookings for calendar:', error);
      if (!isWidget) {
        toast.error('Failed to load calendar bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(currentDate);
  }, [currentDate]);

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event.resource.booking);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // This will be used in Phase 2 for click-to-create functionality
    console.log('Selected slot:', { start, end });
  };

  // Custom event component for styling
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const { booking, color, isUserBooking: isUserBookingEvent } = event.resource;
    
    return (
      <div 
        className="rbc-event-content"
        style={{
          backgroundColor: color,
          opacity: isUserBookingEvent ? 1 : 0.7,
          border: isUserBookingEvent ? '2px solid #1F2937' : 'none',
        }}
      >
        <strong>{booking.purpose}</strong>
        <div className="text-xs">
          {booking.boardroom.name}
        </div>
        {isUserBookingEvent && (
          <div className="text-xs font-medium">Your booking</div>
        )}
      </div>
    );
  };

  // Custom toolbar for widget mode
  const CustomToolbar = ({ label, onNavigate }: any) => {
    if (isWidget) {
      return (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('PREV')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="font-medium text-sm">{label}</span>
            <button
              onClick={() => onNavigate('NEXT')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          <button
            onClick={() => {/* Navigate to full calendar */}}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            View Full Calendar
          </button>
        </div>
      );
    }
    
    // Default toolbar for full calendar
    return null;
  };

  if (loading) {
    return (
      <div className={`${isWidget ? 'h-64' : 'h-96'} flex items-center justify-center`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={isWidget ? 'calendar-widget' : 'calendar-full'}>
      <style jsx>{`
        .calendar-widget .rbc-calendar {
          height: ${height}px;
          font-size: 12px;
        }
        .calendar-widget .rbc-event {
          font-size: 10px;
          padding: 1px 2px;
        }
        .calendar-widget .rbc-header {
          font-size: 11px;
          padding: 2px;
        }
        .calendar-full .rbc-calendar {
          height: ${height}px;
        }
        .rbc-event {
          border-radius: 4px;
          border: none !important;
        }
        .rbc-event-content {
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}</style>
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height }}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={!isWidget}
        views={isWidget ? [Views.MONTH] : [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        view={currentView}
        date={currentDate}
        components={{
          event: EventComponent,
          toolbar: isWidget ? CustomToolbar : undefined,
        }}
        messages={{
          next: "Next",
          previous: "Previous", 
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
          agenda: "Agenda",
          noEventsInRange: "No bookings in this range",
        }}
        formats={{
          monthHeaderFormat: 'MMMM YYYY',
          weekdayFormat: isWidget ? 'dd' : 'dddd',
          dayHeaderFormat: 'MMM DD',
          dayRangeHeaderFormat: ({ start, end }) => 
            `${moment(start).format('MMM DD')} - ${moment(end).format('MMM DD, YYYY')}`,
        }}
      />
    </div>
  );
};

export default CalendarView;