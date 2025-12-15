import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const MAX_BOOKINGS_PER_DAY = 5;

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    count?: number;
  };
}

interface Appointment {
  id: number;
  patient_name: string;
  patient_email?: string;
  patient_contact?: string;
  procedure_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  // Fetch appointments for the calendar
  const fetchCalendarData = async (year: number, month: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/appointments/calendar`, {
        params: { year, month }
      });
      
      const calendarEvents: CalendarEvent[] = response.data.map((item: { date: string; count: number }) => {
        let calendarColor = "Success"; // Green - available
        if (item.count >= MAX_BOOKINGS_PER_DAY) {
          calendarColor = "Danger"; // Red - full
        } else if (item.count >= MAX_BOOKINGS_PER_DAY - 1) {
          calendarColor = "Warning"; // Orange - almost full
        }

        return {
          id: item.date,
          title: `${item.count}/${MAX_BOOKINGS_PER_DAY} Booked`,
          start: item.date,
          extendedProps: { 
            calendar: calendarColor,
            count: item.count 
          },
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    }
  };

  // Fetch appointments for a specific date
  const fetchDayAppointments = async (date: string) => {
    setLoadingAppointments(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/appointments/by-date`, {
        params: { date }
      });
      setDayAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setDayAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    fetchCalendarData(now.getFullYear(), now.getMonth() + 1);
  }, []);

  // Handle clicking on a date cell (empty area)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const dateStr = selectInfo.startStr;
    setSelectedDate(dateStr);
    fetchDayAppointments(dateStr);
    setIsAppointmentModalOpen(true);
  };

  // Handle clicking on an event (appointment count badge)
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const dateStr = event.startStr;
    setSelectedDate(dateStr);
    fetchDayAppointments(dateStr);
    setIsAppointmentModalOpen(true);
  };

  // Handle clicking on a day cell
  const handleDateClick = (info: { dateStr: string; date: Date }) => {
    // Check if clicked date is a weekend
    const day = info.date.getDay();
    if (day === 0 || day === 6) {
      // Weekend - do nothing
      return;
    }
    
    setSelectedDate(info.dateStr);
    fetchDayAppointments(info.dateStr);
    setIsAppointmentModalOpen(true);
  };

  // Handle month/year navigation
  const handleDatesSet = (dateInfo: { start: Date }) => {
    const startDate = dateInfo.start;
    fetchCalendarData(startDate.getFullYear(), startDate.getMonth() + 1);
  };

  const handleAddOrUpdateEvent = () => {
    if (selectedEvent) {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                extendedProps: { calendar: eventLevel },
              }
            : event
        )
      );
    } else {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
    closeModal();
    resetModalFields();
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <>
      <PageMeta
        title="Calendar "
       
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 shadow-lg">
        {/* Header with Legend */}
        <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-800 rounded-t-2xl px-6 py-5">
          <h2 className="text-xl font-bold text-white mb-4">Appointment Calendar</h2>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-sky-100">Availability:</span>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></span>
            <span className="text-sm text-white font-medium">Available (0-3)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></span>
            <span className="text-sm text-white font-medium">Almost Full (4)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></span>
            <span className="text-sm text-white font-medium">Fully Booked (5)</span>
          </div>
        </div>
        </div>

        <div className="custom-calendar p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            eventContent={renderEventContent}
            selectAllow={(selectInfo) => {
              // Disable weekends (Saturday = 6, Sunday = 0)
              const day = selectInfo.start.getDay();
              return day !== 0 && day !== 6;
            }}
            dayCellClassNames={(arg) => {
              const day = arg.date.getDay();
              const isWeekend = day === 0 || day === 6;
              
              // Check if date is in the past
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const cellDate = new Date(arg.date);
              cellDate.setHours(0, 0, 0, 0);
              const isPast = cellDate < today;
              
              if (isWeekend) {
                return ['bg-gray-100', 'dark:bg-gray-800/50', 'text-gray-400', 'dark:text-gray-600', 'cursor-not-allowed'];
              }
              
              if (isPast) {
                return ['bg-gray-100', 'dark:bg-gray-800/50', 'text-gray-400', 'dark:text-gray-500', 'cursor-not-allowed'];
              }
              
              // Add cursor pointer to make it obvious days are clickable
              return ['cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-800/50'];
            }}
          />
        </div>

        {/* Event Modal (for adding custom events) */}
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on track
              </p>
            </div>
            <div className="mt-8">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Title
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Color
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(calendarsEvents).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div className={`form-check form-check-${value} form-check-inline`}>
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => setEventLevel(key)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span className={`h-2 w-2 rounded-full bg-white ${eventLevel === key ? "block" : "hidden"}`}></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter Start Date
                </label>
                <input
                  id="event-start-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter End Date
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                {selectedEvent ? "Update Changes" : "Add Event"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Appointment List Modal */}
        <Modal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          className="max-w-[800px] p-6 lg:p-10"
        >
          <div className="flex flex-col overflow-y-auto custom-scrollbar max-h-[70vh]">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-xl dark:text-white">
                    {formatDate(selectedDate)}
                  </h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {dayAppointments.filter(apt => apt.status.toLowerCase() === 'approved').length}/{MAX_BOOKINGS_PER_DAY} confirmed slots
                    </span>
                    {dayAppointments.filter(apt => apt.status.toLowerCase() === 'approved').length >= MAX_BOOKINGS_PER_DAY && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-full">Fully Booked</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {loadingAppointments ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : dayAppointments.filter(apt => apt.status.toLowerCase() === 'approved').length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No appointments</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  There are no confirmed appointments scheduled for this day.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayAppointments.filter(apt => apt.status.toLowerCase() === 'approved').map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className="group border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                              {appointment.patient_name}
                            </h4>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-13 space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">Procedure:</span> {appointment.procedure_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">Time:</span> {formatTime(appointment.appointment_time)}
                            </p>
                          </div>
                          {appointment.patient_email && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Email:</span> {appointment.patient_email}
                              </p>
                            </div>
                          )}
                          {appointment.patient_contact && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Contact:</span> {appointment.patient_contact}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsAppointmentModalOpen(false)}
                type="button"
                className="flex justify-center rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const calendar = eventInfo.event.extendedProps.calendar;
  let bgColor = 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400';
  let icon = '✓';
  
  if (calendar === 'Danger') {
    bgColor = 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400';
    icon = '●';
  } else if (calendar === 'Warning') {
    bgColor = 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-400';
    icon = '!';
  }

  return (
    <div className={`event-fc-color flex items-center justify-center gap-1.5 fc-event-main ${bgColor} px-2 py-1.5 rounded-lg border shadow-sm text-xs font-semibold cursor-pointer hover:shadow-md transition-shadow`}>
      <span className="text-sm">{icon}</span>
      <span>{eventInfo.event.title}</span>
    </div>
  );
};

export default Calendar;
