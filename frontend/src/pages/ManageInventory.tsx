import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Modal } from "../components/ui/modal";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { showToast } from "../hooks/useToast";
import { GridIcon, ListIcon } from "../icons";

interface InventoryItem {
  id: number;
  name: string;
  stock_quantity: number;
  unit: string;
  created_at: string;
}

export default function ManageInventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewType, setViewType] = useState<"list" | "cards">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInventoryCount, setTotalInventoryCount] = useState(0);
  const [formData, setFormData] = useState({ name: "", stock_quantity: 0, unit: "pieces" });
  const [formErrors, setFormErrors] = useState<{ name?: string; stock_quantity?: string; unit?: string }>({});
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [currentPage, searchTerm, sortBy, sortOrder, perPage]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await fetch(`/api/inventory?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      
      // Handle both paginated and non-paginated responses
      if (data.data && Array.isArray(data.data)) {
        setInventoryItems(data.data);
        setTotalPages(data.last_page || 1);
        setTotalInventoryCount(data.total || 0);
      } else if (Array.isArray(data)) {
        setInventoryItems(data);
        setTotalPages(1);
        setTotalInventoryCount(data.length);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
      showToast("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    // Reset errors
    const errors: { name?: string; stock_quantity?: string; unit?: string } = {};

    // Validate item name
    if (!formData.name || formData.name.trim() === "") {
      errors.name = "Item name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Item name must be at least 2 characters";
    } else if (formData.name.trim().length > 100) {
      errors.name = "Item name cannot exceed 100 characters";
    }

    // Validate stock quantity
    if (formData.stock_quantity === null || formData.stock_quantity === undefined) {
      errors.stock_quantity = "Stock quantity is required";
    } else if (formData.stock_quantity === 0) {
      // Show SweetAlert for zero quantity
      await Swal.fire({
        title: "Invalid Quantity",
        text: "Stock quantity cannot be 0. Please enter a valid quantity.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#EF4444",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      errors.stock_quantity = "Stock quantity cannot be 0";
    } else if (formData.stock_quantity < 0) {
      errors.stock_quantity = "Stock quantity cannot be negative";
    } else if (!Number.isInteger(formData.stock_quantity)) {
      errors.stock_quantity = "Stock quantity must be a whole number";
    }

    // Validate unit
    if (!formData.unit || formData.unit.trim() === "") {
      errors.unit = "Unit is required";
    }

    // Check for validation errors
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Please fix the errors below", "error");
      return;
    }

    // Check for duplicate item name
    const nameLower = formData.name.trim().toLowerCase();
    const isDuplicate = inventoryItems.some(
      (item) => item.name.toLowerCase() === nameLower && item.id !== editingId
    );
    
    if (isDuplicate) {
      errors.name = `Item "${formData.name}" already exists in inventory`;
      setFormErrors(errors);
      await Swal.fire({
        title: "Duplicate Item",
        text: `Item "${formData.name}" already exists in inventory`,
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#F59E0B",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
      return;
    }

    setFormErrors({});

    // Show SweetAlert2 confirmation
    const result = await Swal.fire({
      title: editingId ? "Update Item?" : "Add New Item?",
      html: `<div class="text-left">
        <p class="mb-2"><strong>Item Name:</strong> ${formData.name}</p>
        <p class="mb-2"><strong>Quantity:</strong> ${formData.stock_quantity} ${formData.unit}</p>
      </div>
      <p>Are you sure you want to ${editingId ? 'update' : 'add'} this item?</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: editingId ? "Update" : "Add Item",
      cancelButtonText: "Cancel",
      confirmButtonColor: editingId ? "#3B82F6" : "#10B981",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "100001";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
      },
    });

    if (!result.isConfirmed) return;

    try {
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Swal.fire({
          title: "Success!",
          text: editingId ? "Item updated successfully" : "Item added successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "100001";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
          },
        });
        setFormData({ name: "", stock_quantity: 0, unit: "pieces" });
        setEditingId(null);
        setShowAddForm(false);
        setFormErrors({});
        await fetchInventory();
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to save inventory item",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "100001";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
          },
        });
      }
    } catch (err) {
      console.error("Error saving inventory:", err);
      Swal.fire({
        title: "Error",
        text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "100001";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
        },
      });
    } finally {
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({ name: item.name, stock_quantity: item.stock_quantity, unit: item.unit });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleRestock = async (item: InventoryItem) => {
    const { value: quantity } = await Swal.fire({
      title: `Add Stock to ${item.name}`,
      html: `
        <div class="text-left mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Stock: <strong>${item.stock_quantity} ${item.unit}</strong></p>
        </div>
      `,
      input: "number",
      inputLabel: "Quantity to Add",
      inputPlaceholder: "Enter quantity",
      inputAttributes: {
        min: "1",
        step: "1"
      },
      showCancelButton: true,
      confirmButtonText: "Add Stock",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return "Please enter a valid quantity greater than 0";
        }
        return null;
      },
      didOpen: (modal) => {
        modal.style.zIndex = "100001";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
      },
    });

    if (quantity) {
      const addedQuantity = parseInt(quantity);
      const newQuantity = item.stock_quantity + addedQuantity;

      try {
        const response = await fetch(`/api/inventory/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: item.name,
            stock_quantity: newQuantity,
            unit: item.unit,
          }),
        });

        if (response.ok) {
          Swal.fire({
            title: "Stock Added!",
            html: `<div class="text-left">
              <p class="mb-2">Added <strong>${addedQuantity} ${item.unit}</strong> to ${item.name}</p>
              <p class="text-sm text-gray-600">New Stock: <strong>${newQuantity} ${item.unit}</strong></p>
            </div>`,
            icon: "success",
            confirmButtonText: "OK",
            confirmButtonColor: "#10B981",
            didOpen: (modal) => {
              modal.style.zIndex = "100001";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
            },
          });
          await fetchInventory();
        } else {
          throw new Error("Failed to update stock");
        }
      } catch (err) {
        Swal.fire({
          title: "Error",
          text: "Failed to add stock. Please try again.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "100001";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "100000";
          },
        });
      }
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === sortedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(sortedItems.map((item) => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select at least one item to delete.",
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

    const result = await Swal.fire({
      title: "Delete Selected Items?",
      html: `<p>Are you sure you want to delete <strong>${selectedItems.length}</strong> item(s)?</p>
             <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    if (!result.isConfirmed) return;

    try {
      const deletePromises = selectedItems.map((id) =>
        fetch(`/api/inventory/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
      );

      await Promise.all(deletePromises);

      Swal.fire({
        title: "Deleted!",
        text: `${selectedItems.length} item(s) have been deleted successfully.`,
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      setSelectedItems([]);
      fetchInventory();
    } catch (err) {
      console.error("Error deleting items:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to delete some items. Please try again.",
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
  };

  const handleDelete = async (id: number, itemName: string) => {
    const result = await Swal.fire({
      title: "Delete Item?",
      html: `<p>Are you sure you want to delete <strong>"${itemName}"</strong>?</p>
             <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        Swal.fire({
          title: "Deleted!",
          text: `"${itemName}" has been deleted successfully.`,
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
        fetchInventory();
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to delete inventory item",
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
      console.error("Error deleting inventory:", err);
      Swal.fire({
        title: "Error",
        text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
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
  };

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "out" && item.stock_quantity === 0) ||
      (filterStatus === "low" && item.stock_quantity > 0 && item.stock_quantity < 10) ||
      (filterStatus === "high" && item.stock_quantity >= 10);
    return matchesSearch && matchesFilter;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let compareResult = 0;
    if (sortBy === "name") {
      compareResult = a.name.localeCompare(b.name);
    } else if (sortBy === "stock") {
      compareResult = a.stock_quantity - b.stock_quantity;
    }
    return sortOrder === "asc" ? compareResult : -compareResult;
  });

  const getStatusColor = (quantity: number) => {
    if (quantity === 0) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const getStatusText = (quantity: number) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity < 10) return "Low Stock";
    return "In Stock";
  };

  const getCardBackgroundColor = (quantity: number) => {
    if (quantity === 0) return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700";
    if (quantity < 10) return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700";
    return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Manage Inventory | Abejo AMS"  />
      <PageBreadcrumb pageTitle="Manage Inventory" />

      <div className="space-y-6 p-4 lg:p-6">
        {/* HEADER WITH SEARCH & ADD BUTTON */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start lg:items-center justify-between mb-6">
            <div className="flex-1 w-full lg:w-auto">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Inventory Items</h2>
            </div>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (editingId) {
                  setEditingId(null);
                  setFormData({ name: "", stock_quantity: 0, unit: "pieces" });
                  setFormErrors({});
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {showAddForm ? "Cancel" : "+ Add Item"}
            </button>
          </div>

          {/* ADD/EDIT MODAL */}
          <Modal isOpen={showAddForm} onClose={() => {
            setShowAddForm(false);
            setEditingId(null);
            setFormData({ name: "", stock_quantity: 0, unit: "pieces" });
            setFormErrors({});
          }} className="max-w-md p-6">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                {editingId ? "Edit Item" : "Add New Item"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 transition ${
                      formErrors.name
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    placeholder="Stock Quantity"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 transition ${
                      formErrors.stock_quantity
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.stock_quantity && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.stock_quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 transition ${
                      formErrors.unit
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="pieces">Pieces</option>
                    <option value="ml">ML</option>
                    <option value="mg">MG</option>
                    <option value="box">Box</option>
                  </select>
                  {formErrors.unit && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.unit}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAddOrUpdate}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({ name: "", stock_quantity: 0, unit: "pieces" });
                    setFormErrors({});
                  }}
                  className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>

          {/* SEARCH & FILTER */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6 items-start lg:items-center">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={() => setViewType("cards")}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors flex items-center gap-1 ${
                    viewType === "cards"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <GridIcon className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewType("list")}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors flex items-center gap-1 ${
                    viewType === "list"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                  List
                </button>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="high">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              {/* SELECT BUTTON */}
              {sortedItems.length > 0 && !selectMode && (
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
            </div>
          </div>

          {/* SELECT ALL & BULK DELETE (only when selectMode is active) */}
          {selectMode && sortedItems.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedItems.length === sortedItems.length && sortedItems.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedItems.length === 0
                    ? "Select All"
                    : selectedItems.length === sortedItems.length
                    ? `All ${selectedItems.length} selected`
                    : `${selectedItems.length} selected`}
                </span>
              </div>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete ({selectedItems.length})
                </button>
              )}
              <button
                onClick={() => {
                  setSelectMode(false);
                  setSelectedItems([]);
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ITEMS LIST */}
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No inventory items found
            </div>
          ) : viewType === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border ${getCardBackgroundColor(item.stock_quantity)} ${
                    selectMode && selectedItems.includes(item.id)
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : ""
                  } p-4 hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                      <h4 className="font-semibold text-gray-800 dark:text-white">{item.name}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.stock_quantity)}`}>
                      {getStatusText(item.stock_quantity)}
                    </span>
                  </div>
                  <p className={`text-sm text-gray-500 dark:text-gray-400 mb-4 ${selectMode ? "ml-8" : ""}`}>{item.unit}</p>
                  <div className={`mb-4 ${selectMode ? "ml-8" : ""}`}>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">{item.stock_quantity}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quantity in stock</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRestock(item)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 rounded-lg border ${getCardBackgroundColor(item.stock_quantity)} ${
                    selectMode && selectedItems.includes(item.id)
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : ""
                  } hover:shadow-md transition-all`}
                >
                  <div className="flex items-center gap-4 flex-1 w-full lg:w-auto mb-3 lg:mb-0">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white">{item.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.unit}</p>
                    </div>
                  </div>
                  <div className={`flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-6 w-full lg:w-auto ${selectMode ? "pl-9 lg:pl-0" : ""}`}>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">{item.stock_quantity}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        item.stock_quantity
                      )}`}
                    >
                      {getStatusText(item.stock_quantity)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRestock(item)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {!loading && inventoryItems.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Items per page:
                </label>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, totalInventoryCount)} of {totalInventoryCount}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  ← Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span
                          key={`dots-${page}`}
                          className="px-2 py-1 text-gray-500 dark:text-gray-400"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
