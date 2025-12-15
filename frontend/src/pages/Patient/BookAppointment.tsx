import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { CalenderIcon } from "../../icons";
import { TIME_SLOTS } from "../../config/appointmentConstants";
import flatpickr from "flatpickr";
import { useRef, useEffect } from "react";
import { showToast } from "../../hooks/useToast";
import { useAuth } from "../../config/AuthContext";
import Swal from "sweetalert2";

interface Procedure {
  id: number;
  name: string;
  description: string;
  price: number;
  isAvailable?: boolean;
  requirements?: ProcedureRequirement[];
}

interface ProcedureAvailability {
  [key: number]: boolean; // procedure_id -> is_available
}

interface InventoryItem {
  id: number;
  name: string;
  stock_quantity: number;
  unit: string;
}

interface ProcedureRequirement {
  id: number;
  procedure_id: number;
  inventory_id: number;
  quantity_required: number;
  inventory?: InventoryItem;
}

const MAX_BOOKINGS_PER_DAY = 5;

export default function BookAppointment() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureAvailability, setProcedureAvailability] = useState<ProcedureAvailability>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(100); // Load all procedures for dropdown
  const [bookedSlots, setBookedSlots] = useState<string[]>([]); // Track booked time slots
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [dailyBookingCount, setDailyBookingCount] = useState(0); // Track total bookings for the day
  const [isDayFull, setIsDayFull] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Handle pre-selected date from URL (from calendar)
  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      setSelectedDate(dateParam);
    }
  }, [searchParams]);

  // Fetch procedures and check inventory availability on component mount
  useEffect(() => {
    fetchProceduresAndAvailability();
  }, [currentPage]);

  // Fetch booked slots and daily count when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
      fetchDailyBookingCount(selectedDate);
      // Reset selected time when date changes
      setSelectedTime("");
    } else {
      setBookedSlots([]);
      setDailyBookingCount(0);
      setIsDayFull(false);
    }
  }, [selectedDate]);

  // Fetch daily booking count from calendar endpoint
  const fetchDailyBookingCount = async (date: string) => {
    try {
      const response = await fetch(`/api/appointments/calendar/date/${date}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDailyBookingCount(data.total);
          setIsDayFull(data.is_full);
        }
      }
    } catch (err) {
      console.error("Error fetching daily booking count:", err);
    }
  };

  const fetchBookedSlots = async (date: string) => {
    setIsLoadingSlots(true);
    try {
      const response = await fetch(`/api/appointments`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // API returns array directly
        const appointments = Array.isArray(data) ? data : (data.data || []);
        
        // Filter for approved/completed appointments on the selected date
        // Only block slots that have been confirmed by admin (approved or completed)
        const booked = appointments
          .filter((apt: any) => {
            // Extract just the date part, handle various formats
            let aptDate = String(apt.appointment_date || "");
            
            // If date includes time (e.g., "2025-12-18 00:00:00" or "2025-12-18T00:00:00Z")
            if (aptDate.includes(" ")) {
              aptDate = aptDate.split(" ")[0];
            } else if (aptDate.includes("T")) {
              aptDate = aptDate.split("T")[0];
            }
            
            // Check if this appointment is on the selected date AND has been confirmed
            const isSameDate = aptDate === date;
            // Only block slots for approved and completed appointments (confirmed by admin)
            const isConfirmed = ["approved", "completed"].includes(apt.status);
            
            return isSameDate && isConfirmed;
          })
          .map((apt: any) => {
            // Extract and normalize the time
            const time = String(apt.appointment_time || "");
            if (time) {
              const parts = time.split(":");
              const normalizedTime = `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}`;
              return normalizedTime;
            }
            return null;
          })
          .filter((t: any): t is string => t !== null) as string[];
        
        // Remove duplicates
        const uniqueBooked = Array.from(new Set(booked));
        setBookedSlots(uniqueBooked);
      }
    } catch (err) {
      console.error("Error fetching booked slots:", err);
      setBookedSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchProceduresAndAvailability = async () => {
    setIsLoadingProcedures(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
      });

      const [proceduresRes, availabilityRes, inventoryRes] = await Promise.all([
        fetch(`/api/procedures?${params}`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/procedures-availability", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/inventory?per_page=100", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (proceduresRes.ok) {
        const proceduresData = await proceduresRes.json();
        // Handle both paginated and non-paginated responses
        let proceduresList = proceduresData.data || proceduresData;
        if (!Array.isArray(proceduresList)) {
          proceduresList = [];
        }
        setProcedures(proceduresList);
        
        // Update pagination info
        if (proceduresData.last_page) {
          setTotalPages(proceduresData.last_page);
        }
        
        // Don't set a default procedure - let user select one
      }

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        if (availabilityData && typeof availabilityData === "object") {
          setProcedureAvailability(availabilityData);
        }
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        // Handle both paginated and non-paginated responses
        const inventoryArray = inventoryData.data || inventoryData;
        if (Array.isArray(inventoryArray)) {
          setInventory(inventoryArray);
        }
      }
    } catch (err) {
      console.error("Error fetching procedures:", err);
      showToast("Failed to load procedures", "error");
    } finally {
      setIsLoadingProcedures(false);
    }
  };

  useEffect(() => {
    if (dateInputRef.current) {
      // Get today's date at midnight for accurate comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      flatpickr(dateInputRef.current, {
        mode: "single",
        dateFormat: "Y-m-d",
        minDate: "today", // Prevent past dates
        disable: [
          (date) => {
            // Disable Saturday (6) and Sunday (0)
            return date.getDay() === 0 || date.getDay() === 6;
          },
        ],
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            const date = selectedDates[0];
            const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, "0");
            const day = String(localDate.getDate()).padStart(2, "0");
            const formattedDate = `${year}-${month}-${day}`;
            setSelectedDate(formattedDate);
          }
        },
        onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
          // Add tooltip for disabled dates
          const date = dayElem.dateObj;
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (isWeekend) {
            dayElem.setAttribute("data-tooltip-message", "Our services are only available on weekdays");
            dayElem.classList.add("disabled-weekend");
          } else if (date < today) {
            dayElem.setAttribute("data-tooltip-message", "Cannot book past date");
            dayElem.classList.add("disabled-past-date");
          }
        },
      });
    }
  }, []);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current && (dateInputRef.current as any)._flatpickr) {
      (dateInputRef.current as any)._flatpickr.open();
    }
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  const handleProcedureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProcedureId(Number(e.target.value));
  };

  // Check if a procedure has all required equipment in stock
  const isProcedureEquipmentAvailable = (procedure: Procedure): boolean => {
    // First check: procedure must have at least one equipment/tool assigned
    if (!procedure.requirements || procedure.requirements.length === 0) {
      return false; // Service must have equipment assigned
    }

    // Second check: all assigned equipment must be in stock
    return procedure.requirements.every((req: ProcedureRequirement) => {
      const inventoryItem = inventory.find((inv) => inv.id === req.inventory_id);
      // Equipment is available if it exists and has enough stock
      return inventoryItem && inventoryItem.stock_quantity >= req.quantity_required;
    });
  };

  // Filter only available procedures (available + all equipment in stock)
  const availableProcedures = procedures.filter(
    (proc) => procedureAvailability[proc.id] !== false && isProcedureEquipmentAvailable(proc)
  );

  const selectedProcedure = procedures.find((p) => p.id === selectedProcedureId);
  const isSelectedProcedureAvailable = selectedProcedureId ? procedureAvailability[selectedProcedureId] !== false && isProcedureEquipmentAvailable(selectedProcedure!) : false;
  const basePrice = selectedProcedure?.price || 0;
  const totalPrice = basePrice;

  // Check if selected date is in the past
  const isDateInPast = () => {
    if (!selectedDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    return selectedDateObj < today;
  };
  const isTimeSlotPassed = (timeSlot: string): boolean => {
    if (!selectedDate) return false;
    
    const today = new Date();
    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    
    // Check if the selected date is today
    if (selectedDateObj.toDateString() === today.toDateString()) {
      // Parse the time slot (e.g., "10:00" from "10:00" or from TIME_SLOTS format)
      const [hours, minutes] = timeSlot.split(":").map(Number);
      
      // Create a date object with the selected date and time
      const slotDateTime = new Date(selectedDate + `T${String(hours).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`);
      
      // If the slot time is before current time, it has passed
      return slotDateTime <= today;
    }
    
    // If it's a future date, no slots have passed
    return false;
  };
  const handleBooking = async () => {
    // Validate date and time are selected
    if (!selectedDate || !selectedTime) {
      Swal.fire({
        title: "Incomplete Information",
        text: "Please select both date and time",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    // Validate that selected date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    if (selectedDateObj < today) {
      Swal.fire({
        title: "Invalid Date",
        text: "Cannot book appointments for past dates. Please select a future date.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    // Check if selected time slot is already booked
    if (bookedSlots.includes(selectedTime)) {
      Swal.fire({
        title: "Slot Unavailable",
        text: "This time slot has already been booked. Please select a different time.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    // Check if day is fully booked (5 appointments max)
    if (isDayFull) {
      Swal.fire({
        title: "Date Fully Booked",
        text: `This date already has ${MAX_BOOKINGS_PER_DAY} appointments. Please select a different date.`,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    if (!selectedProcedureId) {
      Swal.fire({
        title: "Service Required",
        text: "Please select a service",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    if (!isSelectedProcedureAvailable) {
      Swal.fire({
        title: "Service Unavailable",
        text: "Selected service is not available due to low inventory",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    if (!user?.id) {
      Swal.fire({
        title: "Authentication Error",
        text: "User not authenticated",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    setIsBooking(true);

    try {
      // Format date and time together
      const appointmentDateTime = `${selectedDate} ${selectedTime}:00`;
      
      const bookingData = {
        patient_id: user.id,
        procedure_id: selectedProcedureId,
        appointment_date: appointmentDateTime,
        appointment_time: selectedTime,
        status: "pending",
      };

      // Show loading state
      Swal.fire({
        title: "Booking Appointment...",
        text: "Please wait",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (modal) => {
          Swal.showLoading();
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();
      Swal.close();

      if (response.ok && data.id) {
        Swal.fire({
          title: "Success!",
          text: "Appointment booked successfully!",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
        // Reset form
        setSelectedDate("");
        setSelectedTime("");
        setSelectedProcedureId(procedures.length > 0 ? procedures[0].id : null);
      } else {
        Swal.fire({
          title: "Booking Failed",
          text: data.message || "Failed to book appointment",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      }
    } catch (err) {
      console.error("Booking error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to book appointment",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
      <PageMeta title="Book Appointment"  />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-4 lg:p-6">
        {/* LEFT SECTION - DATE & TIME SELECTOR */}
        <div className="lg:col-span-2 bg-sky-200 dark:bg-sky-800/40 rounded-2xl lg:rounded-3xl border border-sky-300 dark:border-sky-600 p-4 lg:p-8">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm lg:text-base">
              ← Back
            </button>
            <h2 className="text-lg lg:text-2xl font-semibold text-gray-800 dark:text-white">Select a Slot</h2>
          </div>

          {/* SELECT DATE */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <CalenderIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700 dark:text-gray-300">
                Select Date
              </h3>
            </div>
            <div className="relative mb-4">
              <input
                ref={dateInputRef}
                type="text"
                value={selectedDate}
                placeholder="Click to select date"
                readOnly
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 text-sm lg:text-base"
              />
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <CalenderIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>

          {/* SELECT TIME */}
          <div className="mb-6 lg:mb-8">
            <h3 className="text-xs lg:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 lg:mb-4">
              Select Time {isLoadingSlots && <span className="text-gray-400 ml-2">(Loading...)</span>}
            </h3>
            {!selectedDate ? (
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 italic">
                Please select a date first to see available time slots
              </p>
            ) : isDayFull ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs lg:text-sm text-red-700 dark:text-red-300 font-semibold">
                  🚫 This date is fully booked ({MAX_BOOKINGS_PER_DAY} appointments). Please select a different date.
                </p>
              </div>
            ) : isDateInPast() ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs lg:text-sm text-red-700 dark:text-red-300 font-semibold">
                  ❌ Cannot book for past dates. Please select a future date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot.value);
                  const isPassed = isTimeSlotPassed(slot.value);
                  const isDisabled = isBooked || isPassed;
                  
                  return (
                    <button
                      key={slot.value}
                      onClick={() => !isDisabled && handleSelectTime(slot.value)}
                      disabled={isDisabled}
                      className={`px-2 lg:px-4 py-2 lg:py-3 rounded-lg border-2 text-xs lg:text-sm font-medium transition-all relative ${
                        isPassed
                          ? "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                          : isBooked
                          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 cursor-not-allowed"
                          : selectedTime === slot.value
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                      }`}
                      title={isPassed ? "This time has already passed" : isBooked ? "This slot is already booked" : `Select ${slot.range}`}
                    >
                      <span className={isDisabled ? "opacity-50" : ""}>{slot.range}</span>
                      {isPassed && (
                        <span className="block text-[10px] lg:text-xs mt-0.5 flex items-center justify-center gap-1">
                          ⏰ Passed
                        </span>
                      )}
                      {isBooked && !isPassed && (
                        <span className="block text-[10px] lg:text-xs mt-0.5 flex items-center justify-center gap-1">
                          🔒 Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedDate && !isDateInPast() && bookedSlots.length > 0 && bookedSlots.length < TIME_SLOTS.length && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 flex items-center gap-1">
                🔒 {bookedSlots.length} slot(s) already booked on this date
              </p>
            )}
            {selectedDate && !isDateInPast() && bookedSlots.length === TIME_SLOTS.length && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-3 flex items-center gap-1">
                ❌ All slots are booked on this date. Please select another date.
              </p>
            )}
          </div>


        </div>

        {/* RIGHT SECTION - BOOKING DETAILS */}
        <div className="lg:col-span-1 bg-sky-200 dark:bg-sky-800/40 rounded-2xl lg:rounded-3xl border border-sky-300 dark:border-sky-600 p-4 lg:p-8 lg:sticky lg:top-20 lg:h-fit">
          <h3 className="text-base lg:text-xl font-semibold text-gray-800 dark:text-white mb-4 lg:mb-6">
            Booking Details
          </h3>

          {/* PROCEDURE SELECTION */}
          <div className="mb-4 lg:mb-6">
            <label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Procedure / Service
            </label>
            {isDateInPast() && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-3">
                <p className="text-xs lg:text-sm text-red-700 dark:text-red-300 font-semibold">
                  ❌ Cannot book for past dates. Please select a future date.
                </p>
              </div>
            )}
            {isLoadingProcedures ? (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : availableProcedures.length > 0 ? (
              <>
                <select
                  value={selectedProcedureId || ""}
                  onChange={handleProcedureChange}
                  disabled={isDateInPast()}
                  className="w-full px-3 py-2 lg:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a service</option>
                  {procedures.map((proc) => {
                    const isAvailable = procedureAvailability[proc.id] !== false && isProcedureEquipmentAvailable(proc);
                    const hasEquipment = proc.requirements && proc.requirements.length > 0;
                    const price = typeof proc.price === "number" ? proc.price : parseFloat(proc.price || "0");
                    const priceDisplay = price > 0 ? ` - ₱${price.toFixed(2)}` : "";
                    let disabledReason = "";
                    
                    if (!hasEquipment) {
                      disabledReason = " (No equipment assigned)";
                    } else if (!isAvailable) {
                      disabledReason = " (Out of Stock)";
                    }
                    
                    return (
                      <option key={proc.id} value={proc.id} disabled={!isAvailable}>
                        {proc.name}{priceDisplay}{disabledReason}
                      </option>
                    );
                  })}
                </select>
                {/* Show unavailable services message only if there are any */}
                {procedures.length > availableProcedures.length && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    ⚠️ {procedures.length - availableProcedures.length} service(s) unavailable (missing equipment or out of stock)
                  </p>
                )}
                
                {/* PAGINATION CONTROLS FOR PROCEDURES */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between text-xs gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <span className="text-gray-600 dark:text-gray-400 text-center flex-1">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs lg:text-sm text-red-700 dark:text-red-300">
                  No services available. Please check back later.
                </p>
              </div>
            )}
          </div>

          {/* BOOKING INFO */}
          <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
              <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-white">
                {selectedDate ? `${selectedDate}` : "Not selected"}
                {selectedTime && ` — ${selectedTime}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Service</p>
              <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-white">{selectedProcedure?.name}</p>
              {selectedProcedure?.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{selectedProcedure.description}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Price</p>
              <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-white">₱{basePrice}</p>
            </div>

          </div>

          {/* TOTAL AMOUNT */}
          <div className="mb-4 lg:mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Amount</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white">
              ₱{totalPrice}
            </p>
          </div>

          {/* ACTION BUTTON */}
          <button
            onClick={handleBooking}
            disabled={isBooking || !selectedDate || !selectedTime}
            className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm lg:text-base rounded-lg transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBooking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Booking...
              </>
            ) : (
              "Confirm & Book"
            )}
          </button>
        </div>
      </div>
      <style>{`
        /* Tooltip styling for disabled dates */
        .flatpickr-calendar .flatpickr-day.disabled-past-date,
        .flatpickr-calendar .flatpickr-day.disabled-weekend {
          position: relative;
          cursor: not-allowed;
        }

        /* Tooltip box for disabled dates - positioned outside calendar */
        .flatpickr-calendar .flatpickr-day.disabled-past-date::after,
        .flatpickr-calendar .flatpickr-day.disabled-weekend::after {
          content: attr(data-tooltip-message);
          position: fixed;
          background-color: #dc2626;
          color: white;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease-in-out;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-weight: 500;
          display: none;
        }

        .flatpickr-calendar .flatpickr-day.disabled-weekend::after {
          background-color: #f59e0b;
        }

        /* Show tooltip on hover */
        .flatpickr-calendar .flatpickr-day.disabled-past-date:hover::after,
        .flatpickr-calendar .flatpickr-day.disabled-weekend:hover::after {
          opacity: 1;
          display: block;
          top: auto !important;
          right: auto !important;
          bottom: auto;
          top: -50px;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>
    </>
  );
}
