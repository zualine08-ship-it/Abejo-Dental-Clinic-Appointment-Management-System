import { useEffect, useState, useRef } from "react";
import flatpickr from "flatpickr";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { showToast } from "../../../hooks/useToast";
import Swal from "sweetalert2";
import { CalenderIcon, CheckLineIcon, AngleDownIcon } from "../../../icons";

interface Appointment {
  id: number;
  patient: { id: number; name: string };
  procedure: { id: number; name: string };
  appointment_date: string;
  appointment_time: string;
  status: string;
  cancelled_by?: string;
}

const ITEMS_PER_PAGE = 10;

export default function AppointmentReportTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAppointments();
    
    // Initialize Flatpickr for date inputs
    if (fromDateRef.current) {
      flatpickr(fromDateRef.current, {
        mode: "single",
        dateFormat: "d/m/Y",
        inline: false,
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            setFilterFromDate(selectedDates[0].toISOString().split('T')[0]);
          }
        },
      });
    }

    if (toDateRef.current) {
      flatpickr(toDateRef.current, {
        mode: "single",
        dateFormat: "d/m/Y",
        inline: false,
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            setFilterToDate(selectedDates[0].toISOString().split('T')[0]);
          }
        },
      });
    }
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/appointments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Show ALL appointments except pending (pending is not finalized)
        const reportAppointments = data.filter(
          (a: Appointment) =>
            a.status === "approved" ||
            a.status === "rescheduled" ||
            a.status === "completed" ||
            a.status === "cancelled"
        );
        // Sort by date descending (newest first)
        const sorted = reportAppointments.sort(
          (a: Appointment, b: Appointment) =>
            new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        );
        setAppointments(sorted);
        setCurrentPage(1);
        setSelectedIds(new Set());
      } else {
        setError("Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "rescheduled":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Filter logic
  const filteredData = appointments.filter((item) => {
    const matchesSearch =
      item.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.procedure?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || item.status === filterStatus;
    
    const appointmentDate = new Date(item.appointment_date);
    const matchesFromDate = !filterFromDate || appointmentDate >= new Date(filterFromDate);
    const matchesToDate = !filterToDate || appointmentDate <= new Date(filterToDate);

    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          .report-info { margin-bottom: 15px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1></h1>
        <div class="report-info">
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${filterFromDate ? `<p>From Date: ${new Date(filterFromDate).toLocaleDateString()}</p>` : ""}
          ${filterToDate ? `<p>To Date: ${new Date(filterToDate).toLocaleDateString()}</p>` : ""}
          <p>Total Records: ${filteredData.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Procedure</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Cancelled By</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td>${item.patient?.name || "N/A"}</td>
                <td>${item.procedure?.name || "N/A"}</td>
                <td>${new Date(item.appointment_date).toLocaleDateString()}</td>
                <td>${item.appointment_time}</td>
                <td><span class="status">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
                <td>${item.status === "cancelled" ? (item.cancelled_by === "patient" ? "Patient" : item.cancelled_by === "admin" ? "Admin" : "Unknown") : "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set(paginatedData.map((item) => item.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (appointmentId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      showToast("Please select records to delete", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedIds.size} appointment(s). This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete them!",
      cancelButtonText: "Cancel",
      didOpen: () => {
        const popup = document.querySelector(".swal2-container") as HTMLElement;
        if (popup) {
          popup.style.zIndex = "50";
        }
        const backdrop = document.querySelector(".swal2-backdrop-show") as HTMLElement;
        if (backdrop) {
          backdrop.style.zIndex = "49";
        }
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const idsArray = Array.from(selectedIds);
      await Promise.all(
        idsArray.map((id) =>
          fetch(`/api/appointments/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
        )
      );

      showToast(`${selectedIds.size} appointment(s) deleted successfully`, "success");
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchAppointments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete appointments";
      showToast(errorMessage, "error");
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilterStatus("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  // Calculate statistics
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const approvedCount = appointments.filter((a) => a.status === "approved").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const rescheduledCount = appointments.filter((a) => a.status === "rescheduled").length;

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
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-400 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Patient/Procedure
            </label>
            <input
              type="text"
              placeholder="Select name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => fromDateRef.current?.focus()}
                className="absolute left-3 top-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
              >
                <CalenderIcon className="w-5 h-5" />
              </button>
              <input
                id="fromDate"
                ref={fromDateRef}
                type="text"
                placeholder="dd/mm/yyyy"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => toDateRef.current?.focus()}
                className="absolute left-3 top-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
              >
                <CalenderIcon className="w-5 h-5" />
              </button>
              <input
                id="toDate"
                ref={toDateRef}
                type="text"
                placeholder="dd/mm/yyyy"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(1)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
              title="Reset all filters"
            >
              <AngleDownIcon className="w-4 h-4 rotate-180" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Select Mode Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              <CheckLineIcon className="w-4 h-4" />
              Select
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedIds.size} selected
                </span>
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => {
                  setSelectMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium rounded-lg"
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-400 overflow-hidden">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-400">
              <TableRow>
                {selectMode && (
                  <TableCell
                    isHeader
                    className="px-4 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 text-center text-sm w-12"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableCell>
                )}
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 text-center text-sm"
                >
                  Patient Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Procedure
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 text-center text-sm"
                >
                  Time
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Cancelled By
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-200 dark:divide-gray-600">
              {error ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 7 : 6} className="px-6 py-4 text-center border border-gray-200 dark:border-gray-400 text-red-600 dark:text-red-400">
                    {error}
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 7 : 6} className="px-6 py-4 text-center border border-gray-200 dark:border-gray-400 text-gray-500 dark:text-gray-400">
                    No appointments found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className={`hover:bg-gray-50 border border-gray-200 dark:border-gray-400 dark:hover:bg-gray-800/50 ${selectMode && selectedIds.has(item.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    {selectMode && (
                      <TableCell className="px-4 py-4 text-center border border-gray-200 dark:border-gray-400">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-6 py-4 text-black-900 text-center border border-gray-200 dark:border-gray-400 dark:text-gray-100 text-sm font-medium">
                      {item.patient?.name || "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.procedure?.name || "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {new Date(item.appointment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.appointment_time}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-center border border-gray-200 dark:border-gray-400">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.status === "cancelled" ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.cancelled_by === "patient"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}>
                          {item.cancelled_by === "patient" ? "Patient" : item.cancelled_by === "admin" ? "Admin" : "Unknown"}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold">{startIndex + 1}</span>-
            <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length)}</span> of{" "}
            <span className="font-semibold">{filteredData.length}</span> records
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-400 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                  if (pageNum <= totalPages) return pageNum;
                  return null;
                }).map((page) =>
                  page ? (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 text-sm rounded ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 dark:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  ) : null
                )}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-400 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Totals Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Appointments */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 border border-gray-300 dark:border-gray-400 p-6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Total Appointments</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{appointments.length}</p>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Showing: <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredData.length}</span></p>
            </div>
          </div>

          {/* Completed */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-300 dark:border-blue-600 p-6">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">Completed</p>
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-4">{completedCount}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-4">
              {appointments.length > 0 ? `${Math.round((completedCount / appointments.length) * 100)}%` : "0%"}
            </p>
          </div>

          {/* Approved */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-800/20 border border-green-300 dark:border-green-600 p-6">
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3">Approved</p>
            <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-4">{approvedCount}</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-4">
              {appointments.length > 0 ? `${Math.round((approvedCount / appointments.length) * 100)}%` : "0%"}
            </p>
          </div>

          {/* Cancelled */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 border border-red-300 dark:border-red-600 p-6">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">Cancelled</p>
            <p className="text-4xl font-bold text-red-900 dark:text-red-100 mb-4">{cancelledCount}</p>
            <p className="text-xs text-red-700 dark:text-red-3 mt-4">
              {appointments.length > 0 ? `${Math.round((cancelledCount / appointments.length) * 100)}%` : "0%"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
