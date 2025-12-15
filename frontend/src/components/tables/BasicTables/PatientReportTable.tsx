import { useEffect, useState, useRef } from "react";
import flatpickr from "flatpickr";
import { showToast } from "../../../hooks/useToast";
import Swal from "sweetalert2";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { CalenderIcon, CheckLineIcon, AngleDownIcon } from "../../../icons";

interface PatientRecord {
  id: number;
  patient: {
    id: number;
    name: string;
    date_of_birth: string | null;
    gender: string;
    phone: string;
    age?: number;
  };
  procedure: { id: number; name: string };
  date_performed: string;
  remarks: string;
}

interface ReportData {
  patient_name: string;
  patient_id: number;
  phone: string;
  age: number;
  gender: string;
}

const ITEMS_PER_PAGE = 10;

export default function PatientReportTable() {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  const calculateAge = (dateOfBirth: string | null): number => {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    fetchPatientHistory();
    
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

  const fetchPatientHistory = async () => {
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
        throw new Error(`Failed to fetch patient records (${response.status})`);
      }

      const data: PatientRecord[] = await response.json();

      // Transform data for reporting
      const transformed: ReportData[] = data.map((record) => ({
        patient_name: record.patient?.name || "N/A",
        patient_id: record.patient?.id || 0,
        phone: record.patient?.phone || "N/A",
        age: record.patient?.age || 0,
        gender: record.patient?.gender || "N/A",
      }));

      // Group by patient_id and keep only the latest record per patient
      const uniqueByPatient = Array.from(
        transformed.reduce((map, record) => {
          if (!map.has(record.patient_id)) {
            map.set(record.patient_id, record);
          }
          return map;
        }, new Map<number, ReportData>()).values()
      );

      setReportData(uniqueByPatient);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load patient records";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredData = reportData.filter((item) => {
    const matchesSearch =
      item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesGender = !filterGender || item.gender === filterGender;

    return matchesSearch && matchesGender;
  });

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          .report-info { margin-bottom: 15px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1></h1>
        <div class="report-info">
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${filteredData.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td>${item.patient_name}</td>
                <td>${item.age > 0 ? item.age : "N/A"}</td>
                <td>${item.gender}</td>
                <td>${item.phone}</td>
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
      const newSelected = new Set(paginatedData.map((item) => item.patient_id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (patientId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
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
      text: `You are about to delete ${selectedIds.size} patient record(s). This action cannot be undone!`,
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
      // Delete selected patients from backend
      const idsArray = Array.from(selectedIds);
      await Promise.all(
        idsArray.map((id) =>
          fetch(`/api/patients/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
        )
      );

      showToast(`${selectedIds.size} record(s) deleted successfully`, "success");
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchPatientHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete records";
      showToast(errorMessage, "error");
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  // Calculate statistics
  const maleCount = reportData.filter((p) => p.gender === "Male").length;
  const femaleCount = reportData.filter((p) => p.gender === "Female").length;
  const avgAge = reportData.length > 0 ? Math.round(reportData.reduce((sum, p) => sum + p.age, 0) / reportData.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-400 p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Name
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
              Gender
            </label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
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
                className="absolute left-3 top-2.5 cursor-pointer z-10"
              >
                <CalenderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 hover:opacity-70" />
              </button>
              <input
                id="fromDate"
                ref={fromDateRef}
                type="text"
                placeholder="dd/mm/yyyy"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
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
                className="absolute left-3 top-2.5 cursor-pointer z-10"
              >
                <CalenderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 hover:opacity-70" />
              </button>
              <input
                id="toDate"
                ref={toDateRef}
                type="text"
                placeholder="dd/mm/yyyy"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <button 
              onClick={() => setCurrentPage(1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>
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

      {/* Select Mode Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
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
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Age
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Gender
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-400 text-center text-sm"
                >
                  Phone
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {error ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 5 : 4} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                    {error}
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 5 : 4} className="px-6 py-4 text-center border border-gray-200 dark:border-gray-400 text-gray-600 dark:text-gray-400 font-medium">
                    No patient records found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.patient_id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectMode && selectedIds.has(item.patient_id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    {selectMode && (
                      <TableCell className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.patient_id)}
                          onChange={() => handleSelectRow(item.patient_id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-6 py-4 text-center text-black-900 border border-gray-200 dark:border-gray-400 dark:text-gray-100 text-sm font-medium">
                      {item.patient_name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-gray-700 border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.age >= 0 ? item.age : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-gray-700 border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.gender}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-gray-700 border border-gray-200 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.phone}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-400 flex items-center justify-between">
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
          {/* Total Records */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 border border-gray-300 dark:border-gray-400 p-6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Total Records</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{reportData.length}</p>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Male: <span className="font-semibold text-gray-800 dark:text-gray-200">{maleCount}</span></p>
              <p>Female: <span className="font-semibold text-gray-800 dark:text-gray-200">{femaleCount}</span></p>
            </div>
          </div>

          {/* Average Age */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/30 dark:to-cyan-800/20 border border-cyan-300 dark:border-cyan-400 p-6">
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide mb-3">Average Age</p>
            <p className="text-4xl font-bold text-cyan-900 dark:text-cyan-100 mb-4">{avgAge}</p>
            <p className="text-xs text-cyan-700 dark:text-cyan-300">years</p>
          </div>

          {/* Male Count */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-300 dark:border-blue-400 p-6">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">Male Patients</p>
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-4">{maleCount}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {reportData.length > 0 ? `${Math.round((maleCount / reportData.length) * 100)}%` : "0%"}
            </p>
          </div>

          {/* Female Count */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-900/30 dark:to-pink-800/20 border border-pink-300 dark:border-pink-400 p-6">
            <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-3">Female Patients</p>
            <p className="text-4xl font-bold text-pink-900 dark:text-pink-100 mb-4">{femaleCount}</p>
            <p className="text-xs text-pink-700 dark:text-pink-300">
              {reportData.length > 0 ? `${Math.round((femaleCount / reportData.length) * 100)}%` : "0%"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
