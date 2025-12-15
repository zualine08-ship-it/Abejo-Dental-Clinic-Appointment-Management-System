import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../config/axios";

interface DayData {
  count: number;
  available: number;
  status: "full" | "almost-full" | "available";
}

interface MonthlyData {
  [date: string]: DayData;
}

interface Appointment {
  id: number;
  patient_name?: string;
  procedure: {
    name: string;
    id: number;
  };
  appointment_time: string;
  appointment_date: string;
  status: string;
}

interface SelectedDateData {
  date: string;
  appointments: Appointment[];
  total: number;
  available: number;
  is_full: boolean;
}

export default function PatientCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateData, setSelectedDateData] = useState<SelectedDateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDate, setLoadingDate] = useState(false);

  const MAX_BOOKINGS_PER_DAY = 5;

  // Fetch monthly booking data
  useEffect(() => {
    fetchMonthlyData();
  }, [currentDate]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const year = currentDate.getFullYear();
      
      // Fetch all appointments to show clinic availability (not individual details)
      const response = await axios.get(`/api/appointments/calendar/monthly?month=${month}&year=${year}`);
      if (response.data.success) {
        setMonthlyData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateAppointments = async (date: string) => {
    try {
      setLoadingDate(true);
      // Fetch patient's own appointments for a specific date
      const response = await axios.get(`/api/appointments`, {
        params: { date }
      });
      
      // Get total clinic bookings for that day from monthly data
      const dayData = monthlyData[date];
      const clinicTotal = dayData ? dayData.count : 0;
      
      if (response.data) {
        const myAppointments = Array.isArray(response.data) ? response.data : (response.data.data || []);
        // Backend already filters by authenticated user
        
        setSelectedDateData({
          date: date,
          appointments: myAppointments,
          total: clinicTotal, // Show total clinic bookings, not just patient's
          available: Math.max(0, MAX_BOOKINGS_PER_DAY - clinicTotal),
          is_full: clinicTotal >= MAX_BOOKINGS_PER_DAY
        });
      }
    } catch (error) {
      console.error("Error fetching date appointments:", error);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleDateClick = (date: string) => {
    // Check if clicked date is a weekend
    const clickedDate = new Date(date + "T00:00:00");
    const day = clickedDate.getDay();
    if (day === 0 || day === 6) {
      // Weekend - do nothing
      return;
    }
    
    setSelectedDate(date);
    fetchDateAppointments(date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedDateData(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedDateData(null);
  };

  const handleBookAppointment = () => {
    if (selectedDate) {
      navigate(`/patient-dashboard/book-appointment?date=${selectedDate}`);
    }
  };

  // Calendar rendering helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    return dateStr === formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    return checkDate < today;
  };

  const getDayStatus = (dateStr: string): DayData | null => {
    return monthlyData[dateStr] || null;
  };

  const getDayClassName = (dateStr: string, isCurrentMonth: boolean) => {
    const dayData = getDayStatus(dateStr);
    const past = isPastDate(dateStr);
    const today = isToday(dateStr);
    const selected = selectedDate === dateStr;
    const dateObj = new Date(dateStr + "T00:00:00");
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    let baseClasses = "relative h-14 md:h-14 p-1 text-center transition-all duration-200 rounded-lg border-2 border-sky-300 dark:border-sky-600 ";
    
    // Add cursor style based on weekend/past
    if (isWeekend || past) {
      baseClasses += "cursor-not-allowed ";
    } else {
      baseClasses += "cursor-pointer ";
    }
    
    if (!isCurrentMonth) {
      return baseClasses + "text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50";
    }

    if (isWeekend) {
      return baseClasses + "text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-800 cursor-not-allowed";
    }

    if (past) {
      return baseClasses + "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed";
    }

    if (selected) {
      return baseClasses + "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30";
    }

    if (today) {
      baseClasses += "ring-2 ring-blue-400 ";
    }

    if (dayData) {
      if (dayData.status === "full") {
        return baseClasses + "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50";
      } else if (dayData.status === "almost-full") {
        return baseClasses + "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50";
      }
    }

    return baseClasses + "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40";
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Day headers
    for (const day of dayNames) {
      days.push(
        <div key={`header-${day}`} className="text-center font-bold text-white dark:text-white py-3 text-sm bg-blue-700 dark:bg-blue-800 border-b-2 border-blue-800 dark:border-blue-900">
          {day}
        </div>
      );
    }

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const prevMonth = new Date(year, month, 0);
      const prevDay = prevMonth.getDate() - firstDay + i + 1;
      const dateStr = formatDateString(prevMonth.getFullYear(), prevMonth.getMonth(), prevDay);
      days.push(
        <div key={`empty-${i}`} className={getDayClassName(dateStr, false)}>
          <span className="text-sm">{prevDay}</span>
        </div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day);
      const dayData = getDayStatus(dateStr);
      const past = isPastDate(dateStr);
      const dateObj = new Date(dateStr + "T00:00:00");
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      days.push(
        <div
          key={day}
          className={getDayClassName(dateStr, true)}
          onClick={() => !past && !isWeekend && handleDateClick(dateStr)}
        >
          <span className={`text-sm font-medium ${isToday(dateStr) ? "text-blue-600 dark:text-blue-400" : ""}`}>
            {day}
          </span>
          {dayData && !past && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="flex gap-0.5">
                {[...Array(Math.min(dayData.count, 5))].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      dayData.status === "full"
                        ? "bg-red-500"
                        : dayData.status === "almost-full"
                        ? "bg-orange-500"
                        : "bg-green-500"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Empty cells after last day
    const totalCells = days.length;
    const remainingCells = 7 - ((totalCells - 7) % 7);
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const nextMonth = new Date(year, month + 1, i);
        const dateStr = formatDateString(nextMonth.getFullYear(), nextMonth.getMonth(), i);
        days.push(
          <div key={`next-${i}`} className={getDayClassName(dateStr, false)}>
            <span className="text-sm">{i}</span>
          </div>
        );
      }
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <>
      <PageMeta title="Appointment Calendar | Abejo AMS" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-6 text-sm">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Available</span>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Almost Full (3-4)</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Fully Booked (5)</span>
              </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-sky-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg overflow-hidden sticky top-6">
            {selectedDate ? (
              <>
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-800 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h3>
                  </div>
                </div>

                <div className="p-5">
                {loadingDate ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                  </div>
                ) : selectedDateData ? (
                  <>
                    {/* Availability Status */}
                    <div className={`mb-4 p-4 rounded-xl shadow-sm ${
                      selectedDateData.is_full
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                        : selectedDateData.available <= 2
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {selectedDateData.is_full
                            ? "Fully Booked"
                            : `${selectedDateData.available} slot${selectedDateData.available !== 1 ? "s" : ""} available`}
                        </span>
                        <span className="text-sm">
                          {selectedDateData.total}/{MAX_BOOKINGS_PER_DAY}
                        </span>
                      </div>
                      {!selectedDateData.is_full && (
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              selectedDateData.available <= 2 ? "bg-orange-500" : "bg-green-500"
                            }`}
                            style={{ width: `${(selectedDateData.total / MAX_BOOKINGS_PER_DAY) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Appointments List */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Your Appointments
                      </h4>
                      {selectedDateData.appointments.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            You have no appointments on this date
                          </p>
                          {selectedDateData.total > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              (Clinic has {selectedDateData.total} other {selectedDateData.total === 1 ? 'appointment' : 'appointments'})
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                            {selectedDateData.appointments.map((apt, index) => (
                              <div
                                key={apt.id}
                                className="flex items-center gap-3 p-4 bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-800/20 rounded-xl border-2 border-sky-200 dark:border-sky-800 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                  ✓
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {apt.procedure?.name || 'Unknown Procedure'}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {apt.appointment_time || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {selectedDateData.total > selectedDateData.appointments.length && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                              (Clinic has {selectedDateData.total - selectedDateData.appointments.length} other {selectedDateData.total - selectedDateData.appointments.length === 1 ? 'appointment' : 'appointments'} this day)
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Book Button */}
                    {!selectedDateData.is_full && (
                      <button
                        onClick={handleBookAppointment}
                        className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Book This Date
                      </button>
                    )}

                    {selectedDateData.is_full && (
                      <div className="text-center py-4 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">This date is fully booked</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Please select another date</p>
                      </div>
                    )}
                  </>
                ) : null}
                </div>
              </>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/30 dark:to-sky-800/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-sky-500 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-900 dark:text-white font-bold text-lg mb-1">Select a Date</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click on any available date to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
