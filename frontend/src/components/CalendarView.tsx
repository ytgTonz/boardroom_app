import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
}

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await bookingsAPI.getCalendarBookings();
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
    };

    fetchBookings();
  }, []);

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
        <div className="h-96 md:h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            defaultView="month"
            popup
            showMultiDayTimes
            step={30}
            timeslots={2}
            className="text-xs md:text-sm"
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
    </div>
  );
};

export default CalendarView;