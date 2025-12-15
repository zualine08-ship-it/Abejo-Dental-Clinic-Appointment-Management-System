import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router";
import { GridIcon, ListIcon, CheckLineIcon } from "../../../icons";

interface PatientRecord {
  id: number;
  patient: {
    id: number;
    name: string;
    gender: string;
    phone: string;
    age?: number;
    address?: string;
  };
  procedure: { id: number; name: string };
  date_performed: string;
  remarks: string;
}

interface UniquePatient {
  patient: PatientRecord["patient"];
  procedures: PatientRecord[];
}

export default function PatientRecordTable() {
  const navigate = useNavigate();
  const [uniquePatients, setUniquePatients] = useState<UniquePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState<"" | "Male" | "Female">("");
  const [filterMinProcedures, setFilterMinProcedures] = useState<number | "">("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection handlers
  const togglePatientSelection = (patientId: number) => {
    const newSelected = new Set(selectedPatientIds);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatientIds(newSelected);
  };

  const selectAllPatients = () => {
    if (selectedPatientIds.size === paginatedPatients.length) {
      setSelectedPatientIds(new Set());
    } else {
      const allIds = new Set(paginatedPatients.map(p => p.patient.id));
      setSelectedPatientIds(allIds);
    }
  };

  // Filter logic
  const filteredPatients = uniquePatients.filter((item) => {
    // Search by name
    const matchesSearch = item.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.patient?.phone?.includes(searchTerm);

    // Filter by gender
    const matchesGender = !filterGender || item.patient?.gender === filterGender;

    // Filter by minimum procedures
    const matchesProcedures = filterMinProcedures === "" || item.procedures.length >= filterMinProcedures;

    return matchesSearch && matchesGender && matchesProcedures;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterMinProcedures("");
    setCurrentPage(1);
  };

  const deleteSelectedPatients = async () => {
    if (selectedPatientIds.size === 0) {
      Swal.fire({
        title: "No Selection",
        text: "Please select at least one patient",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete Patient Records?",
      text: `You are about to permanently delete records for ${selectedPatientIds.size} patient(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "50";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
      },
    });

    if (!result.isConfirmed) return;

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: `Deleting ${selectedPatientIds.size} patient record(s)`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        Swal.showLoading();
        modal.style.zIndex = "50";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
      },
    });

    try {
      let successCount = 0;
      for (const patientId of selectedPatientIds) {
        const patient = uniquePatients.find(p => p.patient.id === patientId);
        if (!patient) continue;

        for (const record of patient.procedures) {
          const response = await fetch(`/api/patient-history/${record.id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          const data = await response.json();
          if (response.ok && data.success) {
            successCount++;
          }
        }
      }

      // Remove deleted patients from list
      const newPatients = uniquePatients.filter(p => !selectedPatientIds.has(p.patient.id));
      setUniquePatients(newPatients);
      setSelectedPatientIds(new Set());
      setSelectMode(false);
      
      Swal.fire({
        title: "Success!",
        text: `Deleted ${selectedPatientIds.size} patient record(s)`,
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to delete selected patients",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/patient-history", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        console.error("API Error - Status:", response.status, response.statusText);
        setError(`Failed to fetch patient records (${response.status})`);
        return;
      }
      
      const data = await response.json();
      console.log("Patient history data:", data);
      
      if (Array.isArray(data)) {
        // Group records by patient ID to get unique patients
        const patientMap = new Map<number, UniquePatient>();
        
        data.forEach((record: PatientRecord) => {
          const patientId = record.patient.id;
          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
              patient: record.patient,
              procedures: []
            });
          }
          patientMap.get(patientId)!.procedures.push(record);
        });
        
        const uniquePatientsList = Array.from(patientMap.values());
        setUniquePatients(uniquePatientsList);
        setError("");
      } else {
        console.error("Data is not an array:", data);
        setError("Failed to fetch patient records");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Error loading patient records: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (patient: UniquePatient) => {
    navigate(`/patient-procedure-history/${patient.patient.id}`);
  };

  const handleDeletePatient = async (patientId: number) => {
    const patient = uniquePatients.find(p => p.patient.id === patientId);
    if (!patient) return;

    const result = await Swal.fire({
      title: "Delete All Patient Records?",
      html: `<div class="text-left">
        <p class="mb-2"><strong>Patient Name:</strong> ${patient.patient.name}</p>
        <p class="mb-2"><strong>Total Records:</strong> ${patient.procedures.length}</p>
        <p class="mb-4 text-red-600 font-semibold">This action cannot be undone.</p>
      </div>
      <p>Are you sure you want to delete all records for this patient?</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "50";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
      },
    });

    if (!result.isConfirmed) return;

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: "Deleting patient records",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        Swal.showLoading();
        modal.style.zIndex = "50";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
      },
    });

    try {
      // Delete all procedure records for this patient
      let successCount = 0;
      for (const record of patient.procedures) {
        const response = await fetch(`/api/patient-history/${record.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok && data.success) {
          successCount++;
        }
      }
      
      if (successCount === patient.procedures.length) {
        setUniquePatients(uniquePatients.filter((p) => p.patient.id !== patientId));
        Swal.fire({
          title: "Success!",
          text: "All patient records deleted successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "50";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
          },
        });
      } else {
        Swal.fire({
          title: "Partial Delete",
          text: "Some records failed to delete",
          icon: "warning",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "50";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
          },
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to delete patient records",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white"></h3>
          {selectedPatientIds.size > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              ✓ {selectedPatientIds.size} patient(s) selected
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {/* Delete Selected Button */}
          {selectMode && selectedPatientIds.size > 0 && (
            <button
              onClick={deleteSelectedPatients}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Delete Selected Patients"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedPatientIds.size})
            </button>
          )}

          {/* Select Button / Select All Controls */}
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select
            </button>
          ) : (
            <>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedPatientIds.size === paginatedPatients.length && paginatedPatients.length > 0}
                  onChange={selectAllPatients}
                  className="w-5 h-5 cursor-pointer"
                  title="Select All Patients"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedPatientIds.size === 0
                    ? "Select All"
                    : selectedPatientIds.size === paginatedPatients.length
                    ? `All ${selectedPatientIds.size} selected`
                    : `${selectedPatientIds.size} selected`}
                </span>
              </label>
              <button
                onClick={() => {
                  setSelectMode(false);
                  setSelectedPatientIds(new Set());
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* View Toggle Buttons */}
          <div className="flex gap-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === "card"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title="Card View"
            >
              <GridIcon className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Minimalistic Filter Toggle Button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
              showFilterPanel
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            } ${(searchTerm || filterGender || filterMinProcedures !== "") ? "ring-2 ring-blue-400" : ""}`}
            title={showFilterPanel ? "Hide Filters" : "Show Filters"}
          >
            <CheckLineIcon className="w-4 h-4" />
            Filter {(searchTerm || filterGender || filterMinProcedures !== "") ? "✓" : ""}
          </button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilterPanel && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">Filters</h4>
            {(searchTerm || filterGender || filterMinProcedures !== "") && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search by Name/Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Name or Phone
              </label>
              <input
                type="text"
                placeholder="Enter name or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                value={filterGender}
                onChange={(e) => {
                  setFilterGender(e.target.value as "" | "Male" | "Female");
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Filter by Minimum Procedures */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Procedures
              </label>
              <select
                value={filterMinProcedures}
                onChange={(e) => {
                  setFilterMinProcedures(e.target.value === "" ? "" : parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
                <option value="10">10+</option>
              </select>
            </div>

            {/* Results Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Results
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold">
                {filteredPatients.length} of {uniquePatients.length}
              </div>
            </div>
          </div>
        </div>
      )}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedPatients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No patient records match your filters</p>
          </div>
        ) : (
          paginatedPatients.map((item) => {
            const statusColor = item.procedures.length > 0 ? "bg-green-500" : "bg-yellow-500";
            const statusIcon = item.procedures.length > 0 ? "✓" : "⚠";

            return (
              <div key={item.patient.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden ${selectMode && selectedPatientIds.has(item.patient.id) ? "ring-2 ring-blue-500" : ""}`}>
                {/* Patient Header */}
                <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
                  {/* Checkbox */}
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedPatientIds.has(item.patient.id)}
                      onChange={() => togglePatientSelection(item.patient.id)}
                      className="absolute top-4 left-4 w-5 h-5 cursor-pointer"
                    />
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full ${statusColor} text-white flex items-center justify-center text-sm font-bold`}>
                    {statusIcon}
                  </div>

                  {/* Patient Avatar and Name */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-white text-lg font-bold">
                      {item.patient?.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{item.patient?.name || "N/A"}</h3>
                      <p className="text-blue-100 text-sm">Last visit: {item.procedures[0]?.date_performed || "No visits"}</p>
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="p-4 space-y-3">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">📅</span>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Age</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.patient?.age || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">⚦</span>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Gender</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.patient?.gender || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📞 Contact</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{item.patient?.phone || "N/A"}</p>
                  </div>

                  {/* Address */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📍 Address</p>
                    <p className="text-sm text-gray-900 dark:text-white">{item.patient?.address || "N/A"}</p>
                  </div>

                  {/* Procedures Count */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🏥 Procedures</p>
                    <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">{item.procedures.length} Times</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleViewHistory(item)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      title="View History"
                    >
                      History
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Select</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Name</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Age</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Gender</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Contact</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Procedures</th>
                  <th className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 text-left text-sm">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No patient records match your filters
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((item) => (
                    <tr key={item.patient.id} className={`border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectMode && selectedPatientIds.has(item.patient.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                      <td className="px-6 py-4 text-sm">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedPatientIds.has(item.patient.id)}
                            onChange={() => togglePatientSelection(item.patient.id)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{item.patient?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.patient?.age || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.patient?.gender || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.patient?.phone || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{item.procedures.length}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">times</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewHistory(item)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                          title="View History"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredPatients.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPatients.length)} of {filteredPatients.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPage === 1
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and adjacent pages
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, arr) => (
                  <span key={page} className="flex items-center">
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPage === totalPages
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
