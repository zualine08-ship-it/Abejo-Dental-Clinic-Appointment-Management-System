import { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import { Modal } from "./index";
import { CalenderIcon } from "../../../icons";
import flatpickr from "flatpickr";
import { PROCEDURES, TIME_SLOTS } from "../../../config/appointmentConstants";

// Inject CSS to ensure SweetAlert2 always appears on top
const style = document.createElement("style");
style.textContent = `
  .swal2-container {
    z-index: 999999 !important;
  }
  .swal2-modal {
    z-index: 999999 !important;
  }
`;
document.head.appendChild(style);

interface WalkInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Procedure {
  id: number;
  name: string;
  description: string;
  price: number;
  isAvailable?: boolean;
  requirements?: ProcedureRequirement[];
}

interface ProcedureRequirement {
  id: number;
  procedure_id: number;
  inventory_id: number;
  quantity_required: number;
  inventory?: InventoryItem;
}

interface InventoryItem {
  id: number;
  name: string;
  stock_quantity: number;
  unit: string;
}

interface ProcedureAvailability {
  [key: number]: boolean;
}

export default function WalkInModal({ open, onClose, onSuccess }: WalkInModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    contact: "",
    email: "",
    procedure_id: 0,
    date: "",
    time: "",
  });

  // Patient search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [reviewList, setReviewList] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureAvailability, setProcedureAvailability] = useState<ProcedureAvailability>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch procedures and inventory on modal open
  useEffect(() => {
    if (open) {
      fetchProceduresAndAvailability();
    }
  }, [open]);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (formData.date && open) {
      fetchBookedSlots(formData.date);
    } else {
      setBookedSlots([]);
    }
  }, [formData.date, open]);

  const fetchProceduresAndAvailability = async () => {
    setIsLoadingProcedures(true);
    try {
      const [proceduresRes, availabilityRes, inventoryRes] = await Promise.all([
        fetch(`/api/procedures?per_page=100`, {
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
        const proceduresList = proceduresData.data || proceduresData;
        if (Array.isArray(proceduresList)) {
          setProcedures(proceduresList);
        }
      }

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        if (availabilityData && typeof availabilityData === "object") {
          setProcedureAvailability(availabilityData);
        }
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        const inventoryArray = inventoryData.data || inventoryData;
        if (Array.isArray(inventoryArray)) {
          setInventory(inventoryArray);
        }
      }
    } catch (err) {
      console.error("Error fetching procedures:", err);
    } finally {
      setIsLoadingProcedures(false);
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
        const appointments = Array.isArray(data) ? data : (data.data || []);

        const booked = appointments
          .filter((apt: any) => {
            let aptDate = String(apt.appointment_date || "");
            if (aptDate.includes(" ")) {
              aptDate = aptDate.split(" ")[0];
            } else if (aptDate.includes("T")) {
              aptDate = aptDate.split("T")[0];
            }
            return aptDate === date && apt.status === "approved";
          })
          .map((apt: any) => {
            const time = String(apt.appointment_time || "");
            if (time) {
              const parts = time.split(":");
              const normalizedTime = `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}`;
              return normalizedTime;
            }
            return null;
          })
          .filter((t: any): t is string => t !== null);

        const uniqueBooked = Array.from(new Set(booked)) as string[];
        setBookedSlots(uniqueBooked);
      }
    } catch (err) {
      console.error("Error fetching booked slots:", err);
      setBookedSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Search for existing patient records
  const searchPatientRecords = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/patients?search=${encodeURIComponent(query)}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.data || []);
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching patients:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a patient from search results
  const selectPatientFromSearch = (patient: any) => {
    setFormData({
      ...formData,
      name: patient.name || "",
      age: patient.age ? String(patient.age) : "",
      contact: patient.phone || patient.contact || "",
      email: patient.email || "",
    });
    setSelectedPatient(patient);
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);
  };

  // Clear search and patient selection
  const clearPatientSelection = () => {
    setFormData({
      name: "",
      age: "",
      contact: "",
      email: "",
      procedure_id: 0,
      date: "",
      time: "",
    });
    setSelectedPatient(null);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  useEffect(() => {
    if (open && dateInputRef.current) {
      if ((dateInputRef.current as any)._flatpickr) {
        (dateInputRef.current as any)._flatpickr.destroy();
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      flatpickr(dateInputRef.current, {
        mode: "single",
        dateFormat: "Y-m-d",
        minDate: "today",
        disable: [
          (date) => {
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
            setFormData((prev) => ({ ...prev, date: formattedDate, time: "" }));
          }
        },
        onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
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
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalendarIconClick = () => {
    if (dateInputRef.current && (dateInputRef.current as any)._flatpickr) {
      (dateInputRef.current as any)._flatpickr.open();
    }
  };

  const checkProcedureAvailability = (procedureId: number): boolean => {
    // First check: procedure must have at least one equipment/tool assigned
    const procedure = procedures.find((p) => p.id === procedureId);
    if (!procedure || !procedure.requirements || procedure.requirements.length === 0) {
      return false; // Service must have equipment assigned
    }

    // Second check: all assigned equipment must be in stock
    const hasStockAvailable = procedure.requirements.every((req: ProcedureRequirement) => {
      const inventoryItem = inventory.find((inv) => inv.id === req.inventory_id);
      return inventoryItem && inventoryItem.stock_quantity >= req.quantity_required;
    });

    // Third check: procedure availability status
    return procedureAvailability[procedureId] !== false && hasStockAvailable;
  };

  const handleAddToReview = () => {
    if (
      !formData.name ||
      !formData.age ||
      !formData.contact ||
      !formData.procedure_id ||
      !formData.date ||
      !formData.time
    ) {
      Swal.fire({
        title: "Warning",
        text: "Please complete all required fields.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Check if time slot is already booked
    if (bookedSlots.includes(formData.time)) {
      Swal.fire({
        title: "Time Slot Booked",
        text: "This time slot is already booked. Please select another time.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Check if procedure is available
    if (!checkProcedureAvailability(Number(formData.procedure_id))) {
      Swal.fire({
        title: "Service Unavailable",
        text: "Selected service is not available due to low inventory",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const proc = procedures.find((p) => p.id === Number(formData.procedure_id));

    setReviewList((prev) => [
      ...prev,
      {
        ...formData,
        procedure_id: Number(formData.procedure_id),
        procedure_name: proc?.name,
        price: proc?.price,
      },
    ]);

    Swal.fire({
      title: "Added!",
      text: "Appointment added to review list.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb",
      timer: 1500,
    });

    setFormData({
      name: "",
      age: "",
      contact: "",
      email: "",
      procedure_id: 0,
      date: "",
      time: "",
    });
  };

  const handleEditReview = (index: number) => {
    const item = reviewList[index];
    setFormData({
      name: item.name,
      age: item.age,
      contact: item.contact,
      email: item.email,
      procedure_id: item.procedure_id,
      date: item.date,
      time: item.time,
    });
    setEditingIndex(index);
  };

  const handleUpdateReview = () => {
    if (
      !formData.name ||
      !formData.age ||
      !formData.contact ||
      !formData.procedure_id ||
      !formData.date ||
      !formData.time
    ) {
      Swal.fire({
        title: "Warning",
        text: "Please complete all required fields.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Check if time slot is already booked (excluding current edit)
    const otherBookedSlots = bookedSlots;
    if (otherBookedSlots.includes(formData.time)) {
      Swal.fire({
        title: "Time Slot Booked",
        text: "This time slot is already booked. Please select another time.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (!checkProcedureAvailability(Number(formData.procedure_id))) {
      Swal.fire({
        title: "Service Unavailable",
        text: "Selected service is not available due to low inventory",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const proc = procedures.find((p) => p.id === Number(formData.procedure_id));

    const updatedList = [...reviewList];
    updatedList[editingIndex!] = {
      ...formData,
      procedure_id: Number(formData.procedure_id),
      procedure_name: proc?.name,
      price: proc?.price,
    };
    setReviewList(updatedList);

    Swal.fire({
      title: "Updated!",
      text: "Appointment updated successfully.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb",
      timer: 1500,
    });

    setEditingIndex(null);
    setFormData({
      name: "",
      age: "",
      contact: "",
      email: "",
      procedure_id: 0,
      date: "",
      time: "",
    });
  };

  const handleRemoveReview = (index: number) => {
    Swal.fire({
      title: "Remove Appointment?",
      text: "Are you sure you want to remove this appointment from the review list?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
    }).then((result) => {
      if (result.isConfirmed) {
        setReviewList((prev) => prev.filter((_, i) => i !== index));
        Swal.fire({
          title: "Removed!",
          text: "Appointment removed from review list.",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#2563eb",
          timer: 1500,
        });
      }
    });
  };

  const handleSubmit = async () => {
    if (reviewList.length === 0) {
      Swal.fire({
        title: "Empty",
        text: "No appointments to submit.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Validate that all appointments have complete data
    const hasInvalidAppointment = reviewList.some(
      (item) =>
        !item.name ||
        !item.age ||
        !item.contact ||
        !item.procedure_id ||
        !item.date ||
        !item.time
    );

    if (hasInvalidAppointment) {
      Swal.fire({
        title: "Invalid Data",
        text: "Some appointments have incomplete information. Please review the details.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Show loading state
    Swal.fire({
      title: "Saving Walk-In Appointments...",
      text: "Please wait",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        Swal.showLoading();
      },
    });

    try {
      // Create appointments for each walk-in patient
      const appointmentPromises = reviewList.map((item) => {
        // Combine date and time into a datetime string (YYYY-MM-DD HH:mm:ss)
        const appointmentDateTime = `${item.date} ${item.time}:00`;
        
        const appointmentData = {
          patient_id: null,
          procedure_id: item.procedure_id,
          appointment_date: appointmentDateTime,
          appointment_time: item.time,
          status: "approved",
          patient_info: {
            name: item.name,
            age: item.age || 0,
            contact: item.contact,
            email: item.email,
            gender: "Not Specified",
            address: "",
          },
        };

        return fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(appointmentData),
        });
      });

      const responses = await Promise.all(appointmentPromises);
      const results = await Promise.all(responses.map((res) => res.json()));

      Swal.close();

      // Check if all succeeded
      const successCount = responses.filter((res) => res.ok).length;
      const failedCount = responses.length - successCount;

      if (failedCount === 0) {
        Swal.fire({
          title: "Success!",
          text: `${reviewList.length} walk-in appointment(s) created successfully!`,
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#2563eb",
        });

        setReviewList([]);
        onSuccess?.();
        onClose();
      } else if (successCount > 0) {
        Swal.fire({
          title: "Partial Success",
          text: `${successCount} appointment(s) created successfully, ${failedCount} failed.`,
          icon: "warning",
          confirmButtonText: "OK",
          confirmButtonColor: "#2563eb",
        });

        setReviewList([]);
        onClose();
      } else {
        const errorMessage = results[0]?.message || "Failed to create appointments";
        Swal.fire({
          title: "Error",
          text: errorMessage,
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (err) {
      console.error("Error submitting appointments:", err);
      Swal.close();
      Swal.fire({
        title: "Error",
        text: "Failed to save walk-in appointments. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const isTimeSlotBooked = (time: string): boolean => bookedSlots.includes(time);

  const isTimeSlotPassed = (timeSlot: string): boolean => {
    if (!formData.date) return false;
    
    const today = new Date();
    const selectedDateObj = new Date(formData.date + "T00:00:00");
    
    // Check if the selected date is today
    if (selectedDateObj.toDateString() === today.toDateString()) {
      // Parse the time slot (e.g., "10:00")
      const [hours, minutes] = timeSlot.split(":").map(Number);
      
      // Create a date object with the selected date and time
      const slotDateTime = new Date(formData.date + `T${String(hours).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`);
      
      // If the slot time is before current time, it has passed
      return slotDateTime <= today;
    }
    
    // If it's a future date, no slots have passed
    return false;
  };

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        className="max-w-6xl w-full p-6 lg:p-10 h-[95vh]"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3">
          <h5 className="mb-6 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
            Add Walk-In Appointment
          </h5>

             {/* Main Content: double page */}
    <div className="flex flex-1 gap-6 overflow-hidden"></div>

          <div className="grid grid-cols-2 gap-8 h-full">
            {/* LEFT - FORM */}
            <div className="flex-1 overflow-y-auto pr-6 border-r border-gray-200 dark:border-gray-700 custom-scrollbar">             
               {/* SEARCH EXISTING PATIENT - MINIMAL */}
              <div className="mb-4 relative w-full">
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                     <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Search Patient Record (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchPatientRecords(e.target.value);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-400"
                      />
                      {isSearching && (
                        <div className="absolute right-2 top-1.5">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown - Compact */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 max-h-32 overflow-y-auto z-10 shadow-lg">
                        {searchResults.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => selectPatientFromSearch(patient)}
                            className="px-2 py-1.5 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-sm"
                          >
                            <div className="font-small text-gray-900 dark:text-white">{patient.name}</div>
                            {(patient.email || patient.phone) && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {patient.email && <span>{patient.email}</span>}
                                {patient.email && patient.phone && <span> • </span>}
                                {patient.phone && <span>{patient.phone}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {showSearchResults && searchQuery.trim().length > 0 && searchResults.length === 0 && !isSearching && (
                      <div className="absolute top-full left-0 right-0 mt-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                        No records found
                      </div>
                    )}
                  </div>
                  
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={clearPatientSelection}
                      className="mt-6 text-xs px-2.5 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {selectedPatient && (
                  <div className="mt-1 text-xs text-green-700 dark:text-green-400">
                    ✓ {selectedPatient.name}
                  </div>
                )}
              </div>

              <h6 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Patient Information</h6>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly={!!selectedPatient}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 ${
                    selectedPatient ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                  }`}
                  placeholder="Enter patient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  readOnly={!!selectedPatient}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 ${
                    selectedPatient ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                  }`}
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  readOnly={!!selectedPatient}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 ${
                    selectedPatient ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                  }`}
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly={!!selectedPatient}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 ${
                    selectedPatient ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                  }`}
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Dental Service <span className="text-red-500">*</span>
                </label>
                <select
                  name="procedure_id"
                  value={formData.procedure_id}
                  onChange={handleChange}
                  disabled={isLoadingProcedures}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value={0}>Select Service</option>
                  {procedures.map((p) => {
                    const isAvailable = checkProcedureAvailability(p.id);
                    const hasEquipment = p.requirements && p.requirements.length > 0;
                    let disabledReason = "";
                    
                    if (!hasEquipment) {
                      disabledReason = " (No equipment assigned)";
                    } else if (!isAvailable) {
                      disabledReason = " (Low Stock)";
                    }
                    
                    return (
                      <option key={p.id} value={p.id} disabled={!isAvailable}>
                        {p.name} — ₱{p.price}{disabledReason}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="text"
                    name="date"
                    value={formData.date}
                    placeholder="Select date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 pl-10"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={handleCalendarIconClick}
                    className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <CalenderIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  disabled={!formData.date || isLoadingSlots}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Select Time</option>
                  {TIME_SLOTS.map((slot) => {
                    const isBooked = isTimeSlotBooked(slot.value);
                    const isPassed = isTimeSlotPassed(slot.value);
                    const isDisabled = isBooked || isPassed;
                    
                    return (
                      <option 
                        key={slot.value} 
                        value={slot.value} 
                        disabled={isDisabled}
                      >
                        {slot.display} {isPassed ? "(Passed)" : isBooked ? "(Booked)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={editingIndex !== null ? handleUpdateReview : handleAddToReview}
                className="w-l mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {editingIndex !== null ? "✓ Update Appointment" : "+ Add to Review"}
              </button>
            </div>

            {/* RIGHT - REVIEW LIST */}
            <div className="space-y-4 flex flex-col">
              <h6 className="font-semibold text-gray-700 dark:text-gray-300">Review Appointments ({reviewList.length})</h6>

              <div className="space-y-3 max-h-96 overflow-y-auto flex-1 custom-scrollbar">
                {reviewList.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No appointments added yet.
                  </p>
                ) : (
                  reviewList.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm"
                    >
                      <div className="text-sm space-y-1">
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Name:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                        </p>
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Age:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.age}</span>
                        </p>
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Contact:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.contact}</span>
                        </p>
                        {item.email && (
                          <p>
                            <strong className="text-gray-700 dark:text-gray-300">Email:</strong>{" "}
                            <span className="text-gray-600 dark:text-gray-400">{item.email}</span>
                          </p>
                        )}
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Service:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.procedure_name}</span>
                        </p>
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Price:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">₱{item.price}</span>
                        </p>
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Date:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.date}</span>
                        </p>
                        <p>
                          <strong className="text-gray-700 dark:text-gray-300">Time:</strong>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{item.time}</span>
                        </p>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditReview(index)}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            editingIndex === index
                              ? "bg-blue-600 text-white"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                          }`}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => handleRemoveReview(index)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {reviewList.length > 0 && (
                <button
                  onClick={handleSubmit}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Confirm & Save Appointments
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </Modal>
      <style>{`
        /* Tooltip styling for disabled dates in WalkInModal */
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
