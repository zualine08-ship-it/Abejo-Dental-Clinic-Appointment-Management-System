import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import flatpickr from "flatpickr";
import Swal from "sweetalert2";
import { showToast } from "../../../hooks/useToast";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { CalenderIcon, CheckLineIcon, AngleDownIcon } from "../../../icons";

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  stock_quantity: number;
  created_at: string;
  last_restock_date: string | null;
}

interface ReportData extends InventoryItem {
  status: "Out of Stock" | "Low Stock" | "In Stock";
}

const LOW_STOCK_THRESHOLD = 10;
const ITEMS_PER_PAGE = 10;

export default function InventoryReportTable() {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData[]>([]);
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
    fetchInventory();
    
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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch from the same API endpoint as ManageInventory
      const response = await fetch("/api/inventory", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory (${response.status})`);
      }

      const data = await response.json();
      
      // Handle both paginated and non-paginated responses
      let inventoryList: InventoryItem[] = [];
      if (data.data && Array.isArray(data.data)) {
        inventoryList = data.data;
      } else if (Array.isArray(data)) {
        inventoryList = data;
      }

      // Transform data for reporting and add status
      const transformed: ReportData[] = inventoryList.map((item) => ({
        ...item,
        status: item.stock_quantity === 0 
          ? "Out of Stock" 
          : item.stock_quantity < LOW_STOCK_THRESHOLD 
          ? "Low Stock" 
          : "In Stock",
      }));

      setReportData(transformed);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load inventory";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredData = reportData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || item.status === filterStatus;
    
    const createdDate = new Date(item.created_at);
    const matchesFromDate = !filterFromDate || createdDate >= new Date(filterFromDate);
    const matchesToDate = !filterToDate || createdDate <= new Date(filterToDate);

    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
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
        <h1>Inventory Report</h1>
        <div class="report-info">
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${filterFromDate ? `<p>From Date: ${new Date(filterFromDate).toLocaleDateString()}</p>` : ""}
          ${filterToDate ? `<p>To Date: ${new Date(filterToDate).toLocaleDateString()}</p>` : ""}
          <p>Total Records: ${filteredData.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Stock Quantity</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td>${item.stock_quantity}</td>
                <td><span class="status">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
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

  const handleSelectRow = (itemId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select at least one item to delete.",
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
      title: "Delete Selected Items?",
      html: `<p>Are you sure you want to delete <strong>${selectedIds.size}</strong> item(s)?</p>
             <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "50";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
      },
    });

    if (!result.isConfirmed) return;

    try {
      const idsArray = Array.from(selectedIds);
      await Promise.all(
        idsArray.map((id) =>
          fetch(`/api/inventory/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
        )
      );

      Swal.fire({
        title: "Deleted!",
        text: `${selectedIds.size} item(s) deleted successfully.`,
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "50";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "49";
        },
      });
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchInventory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete items";
      Swal.fire({
        title: "Error",
        text: errorMessage,
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

  const handleReset = () => {
    setSearchTerm("");
    setFilterStatus("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  const handleViewHistory = (inventoryId: number) => {
    navigate(`/inventory-activity/${inventoryId}`);
  };

  // Calculate statistics
  const totalItems = reportData.length;
  const outOfStockCount = reportData.filter((item) => item.status === "Out of Stock").length;
  const lowStockCount = reportData.filter((item) => item.status === "Low Stock").length;
  const inStockCount = reportData.filter((item) => item.status === "In Stock").length;
  const totalStockQuantity = reportData.reduce((sum, item) => sum + item.stock_quantity, 0);

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
              Search Item Name
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
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-400">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedIds.size === 0
                    ? "Select All"
                    : selectedIds.size === paginatedData.length
                    ? `All ${selectedIds.size} selected`
                    : `${selectedIds.size} selected`}
                </span>
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
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
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg font-semibold transition-colors"
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
                    className="px-4 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm w-12"
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
                  Item Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm"
                >
                  Unit
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm"
                >
                  Stock Quantity
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm"
                >
                  Created Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-medium bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-300 text-center text-sm"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {error ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 7 : 6} className="px-6 py-4 border border-gray-300 text-center text-red-600 dark:text-red-400">
                    {error}
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 7 : 6} className="px-6 py-4 border border-gray-300 text-center text-gray-500 dark:text-gray-400">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectMode && selectedIds.has(item.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    {selectMode && (
                      <TableCell className="px-4 py-4 text-center text-center border border-gray-300">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-6 py-4 text-black-700 text-center border border-gray-300 dark:border-gray-400 dark:text-gray-100 text-sm font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-300 dark:border-gray-400 dark:text-gray-300 text-sm">
                      {item.unit}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 text-center border border-gray-300 dark:border-gray-400 dark:text-gray-300 text-sm font-medium">
                      {item.stock_quantity}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-center border border-gray-300 dark:border-gray-400">
                      <span
                        className={`inline-flex items-center justify-center border border-gray-300 dark:border-gray-400 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "Out of Stock"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                            : item.status === "Low Stock"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 border border-gray-300 dark:border-gray-400 text-center dark:text-gray-300 text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center border border-gray-300 dark:border-gray-400">
                      <button
                        onClick={() => handleViewHistory(item.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 mx-auto"
                        title="View Activity History"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View History
                      </button>
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
            <span className="font-semibold">{filteredData.length}</span> items
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
          {/* Total Items */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 border border-gray-300 dark:border-gray-400 p-6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Total Items</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{totalItems}</p>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>In Stock: <span className="font-semibold text-gray-800 dark:text-gray-200">{inStockCount}</span></p>
              <p>Low Stock: <span className="font-semibold text-gray-800 dark:text-gray-200">{lowStockCount}</span></p>
              <p>Out of Stock: <span className="font-semibold text-gray-800 dark:text-gray-200">{outOfStockCount}</span></p>
            </div>
          </div>

          {/* In Stock */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 border border-emerald-300 dark:border-emerald-400 p-6">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">In Stock</p>
            <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100 mb-4">{inStockCount}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {totalItems > 0 ? `${Math.round((inStockCount / totalItems) * 100)}%` : "0%"}
            </p>
          </div>

          {/* Low Stock */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-800/20 border border-orange-300 dark:border-orange-400 p-6">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-3">Low Stock</p>
            <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-4">{lowStockCount}</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {totalItems > 0 ? `${Math.round((lowStockCount / totalItems) * 100)}%` : "0%"}
            </p>
          </div>

          {/* Total Quantity */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-300 dark:border-blue-400 p-6">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">Total Quantity</p>
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-4">{totalStockQuantity}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">units</p>
          </div>
        </div>
      </div>
    </div>
  );
}
