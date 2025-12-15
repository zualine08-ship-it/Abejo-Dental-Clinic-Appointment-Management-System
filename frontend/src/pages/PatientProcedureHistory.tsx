import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import { showToast } from "../hooks/useToast";

interface Procedure {
  id: number;
  name: string;
}

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
  procedure: Procedure;
  date_performed: string;
  remarks: string;
}

interface UniquePatient {
  patient: PatientRecord["patient"];
  procedures: PatientRecord[];
}

export default function PatientProcedureHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState<UniquePatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const itemsPerPage = 5;



  const toggleProcedureSelection = (procedureId: number) => {
    const newSelected = new Set(selectedProcedures);
    if (newSelected.has(procedureId)) {
      newSelected.delete(procedureId);
    } else {
      newSelected.add(procedureId);
    }
    setSelectedProcedures(newSelected);
  };

  const selectAllProcedures = () => {
    if (!patientData) return;
    if (selectedProcedures.size === patientData.procedures.length) {
      setSelectedProcedures(new Set());
    } else {
      const allIds = new Set(patientData.procedures.map(p => p.id));
      setSelectedProcedures(allIds);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const filteredProcedures = patientData?.procedures.filter((record) => {
    const matchesSearch = 
      record.procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(record.date_performed).toLocaleDateString("en-US").toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.remarks?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const deleteSelectedProcedures = async () => {
    if (selectedProcedures.size === 0) {
      Swal.fire({
        title: "No Selection",
        text: "Please select at least one procedure to delete",
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
      title: "Delete Procedure Records?",
      html: `<p>Are you sure you want to delete <strong>${selectedProcedures.size}</strong> procedure record(s)?</p><p style="color: #666; margin-top: 10px; font-size: 0.9em;">This action cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
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
      text: "Deleting procedure records",
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
      setLoading(true);
      const selectedIds = Array.from(selectedProcedures);
      
      // Delete each selected procedure
      for (const id of selectedIds) {
        const response = await fetch(`/api/patient-history/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete procedure");
      }

      // Refresh the data
      const historyResponse = await fetch("/api/patient-history");
      if (!historyResponse.ok) throw new Error("Failed to reload patient history");
      
      const data: PatientRecord[] = await historyResponse.json();
      const patientMap = new Map<number, UniquePatient>();
      data.forEach((record) => {
        const patientId = record.patient.id;
        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            patient: record.patient,
            procedures: [],
          });
        }
        patientMap.get(patientId)!.procedures.push(record);
      });

      const patient = patientMap.get(Number(patientId));
      if (patient) {
        setPatientData(patient);
      }

      setSelectedProcedures(new Set());
      setSelectMode(false);
      
      Swal.fire({
        title: "Success!",
        text: `${selectedIds.length} procedure record(s) deleted successfully`,
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
      Swal.fire({
        title: "Error",
        text: err instanceof Error ? err.message : "Error deleting procedure records",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPatientHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/patient-history");
        if (!response.ok) throw new Error("Failed to load patient history");

        const data: PatientRecord[] = await response.json();

        // Group by patient and filter for the specific patient
        const patientMap = new Map<number, UniquePatient>();
        data.forEach((record) => {
          const patientId = record.patient.id;
          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
              patient: record.patient,
              procedures: [],
            });
          }
          patientMap.get(patientId)!.procedures.push(record);
        });

        const patient = patientMap.get(Number(patientId));
        if (!patient) {
          setError("Patient not found");
          return;
        }

        setPatientData(patient);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        showToast("Error loading patient history", "error");
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientHistory();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Procedure History" />
        <div className="p-6 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{error || "Patient not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Patient Procedure History | TailAdmin"
      />
      <PageBreadcrumb pageTitle="Procedure History" />
      
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          ← Go Back
        </button>

        {/* Patient Info Card */}
        <ComponentCard title={`Procedures for ${patientData.patient.name}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Name</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{patientData.patient.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Age</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{patientData.patient.age || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Gender</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{patientData.patient.gender}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Contact</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{patientData.patient.phone}</p>
            </div>
          </div>

          {/* Full Address Section */}
          <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">Complete Address</p>
            <p className="text-base text-gray-900 dark:text-white leading-relaxed">
              {patientData.patient.address || "N/A"}
            </p>
          </div>

          {showFilterPanel && (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Filters</h4>
                {searchTerm && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search by Procedure, Date, or Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Enter procedure name, date, or remarks..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Results: {filteredProcedures.length} of {patientData?.procedures.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Procedures List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Completed Procedures ({filteredProcedures.length})
              </h3>
              <div className="flex items-center gap-3">
                {filteredProcedures.length > 0 && !selectMode && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Select
                  </button>
                )}
                {selectMode && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedProcedures.size === filteredProcedures.length && filteredProcedures.length > 0}
                        onChange={selectAllProcedures}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedProcedures.size === 0
                          ? "Select All"
                          : selectedProcedures.size === filteredProcedures.length
                          ? `All ${selectedProcedures.size} selected`
                          : `${selectedProcedures.size} selected`}
                      </span>
                    </label>
                    {selectedProcedures.size > 0 && (
                      <button
                        onClick={deleteSelectedProcedures}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        title="Delete Selected Procedures"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete ({selectedProcedures.size})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectMode(false);
                        setSelectedProcedures(new Set());
                      }}
                      className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    showFilterPanel
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${(searchTerm) ? "ring-2 ring-blue-400" : ""}`}
                  title={showFilterPanel ? "Hide Filters" : "Show Filters"}
                >
                  🔍 Filter {(searchTerm) ? "✓" : ""}
                </button>
              </div>
            </div>

            {filteredProcedures.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No procedures match your filters</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {filteredProcedures
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((record, index) => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedProcedures.has(record.id)
                            ? "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600"
                            : "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-750 border-blue-200 dark:border-gray-700"
                        } hover:shadow-md`}
                      >
                        <div className="flex gap-4">
                          {selectMode && (
                            <input
                              type="checkbox"
                              checked={selectedProcedures.has(record.id)}
                              onChange={() => toggleProcedureSelection(record.id)}
                              className="w-5 h-5 cursor-pointer mt-1 flex-shrink-0"
                            />
                          )}
                          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                                Procedure #{(currentPage - 1) * itemsPerPage + index + 1}
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {record.procedure.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                                Date Performed
                              </p>
                              <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {new Date(record.date_performed).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                                Remarks
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {record.remarks || "No remarks"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pagination */}
                {Math.ceil(filteredProcedures.length / itemsPerPage) > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      ← Previous
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: Math.ceil(filteredProcedures.length / itemsPerPage) }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProcedures.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(filteredProcedures.length / itemsPerPage)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </ComponentCard>

        {/* Back Button at Bottom */}
      
      </div>
    </>
  );
}
