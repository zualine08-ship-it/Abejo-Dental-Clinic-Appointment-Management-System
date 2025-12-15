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
}

interface ProcedureRequirement {
  id: number;
  procedure_id: number;
  inventory_id: number;
  quantity_required: number;
  inventory?: InventoryItem;
}

interface Procedure {
  id: number;
  name: string;
  description: string;
  price: number;
  requirements?: ProcedureRequirement[];
  isAvailable?: boolean;
}

export default function ManageServices() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingEquipmentQty, setEditingEquipmentQty] = useState<number>(1);
  const [expandedProcedure, setExpandedProcedure] = useState<number | null>(null);
  const [showAddRequirement, setShowAddRequirement] = useState(false);
  const [selectedProcedureForRequirement, setSelectedProcedureForRequirement] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProcedures, setTotalProcedures] = useState(0);
  const [viewType, setViewType] = useState<"list" | "cards">("list");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
  });

  const [requirementForm, setRequirementForm] = useState({
    inventory_id: 0,
    quantity_required: 1,
  });
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null);
  const [equipmentList, setEquipmentList] = useState<Array<{id: string; inventory_id: number; name: string; quantity: number; unit: string; stock_quantity: number}>>([]);
  const [equipmentInput, setEquipmentInput] = useState({ inventory_id: 0, quantity: 1 });

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, sortBy, sortOrder, perPage]);

  // Helper function to set SweetAlert z-index above modal
  const setSwalZIndex = (modal: any) => {
    modal.style.zIndex = "999999";
    const backdrop = document.querySelector(".swal2-container");
    if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const [proceduresRes, inventoryRes, availabilityRes] = await Promise.all([
        fetch(`/api/procedures?${params}`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`/api/inventory`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/procedures-availability", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (!proceduresRes.ok) {
        console.error("Procedures API error:", proceduresRes.status, proceduresRes.statusText);
        throw new Error(`Procedures API error: ${proceduresRes.status}`);
      }
      if (!inventoryRes.ok) {
        console.error("Inventory API error:", inventoryRes.status, inventoryRes.statusText);
        throw new Error(`Inventory API error: ${inventoryRes.status}`);
      }
      if (!availabilityRes.ok) {
        console.error("Availability API error:", availabilityRes.status, availabilityRes.statusText);
        throw new Error(`Availability API error: ${availabilityRes.status}`);
      }

      const proceduresData = await proceduresRes.json();
      const inventoryData = await inventoryRes.json();
      const availabilityData = await availabilityRes.json();

      // Handle paginated procedures response
      if (proceduresData.data && Array.isArray(proceduresData.data)) {
        const proceduresWithAvailability = proceduresData.data.map((proc: any) => ({
          id: proc.id || 0,
          name: proc.name || "Unknown",
          description: proc.description || "",
          price: isNaN(parseFloat(proc.price)) ? 0 : parseFloat(proc.price),
          requirements: Array.isArray(proc.requirements) ? proc.requirements : [],
          isAvailable: availabilityData[proc.id] !== false,
        }));
        setProcedures(proceduresWithAvailability);
        setTotalPages(proceduresData.last_page || 1);
        setTotalProcedures(proceduresData.total || 0);
        // Use the first page of procedures for duplicate checking (more efficient)
        setAllProcedures(proceduresWithAvailability);
      }

      // Handle inventory (might be paginated or not)
      const inventoryArray = inventoryData.data ? inventoryData.data : inventoryData;
      console.log("Inventory data:", inventoryArray);
      if (Array.isArray(inventoryArray)) {
        const validInventory = inventoryArray.map((item: any) => ({
          id: item.id || 0,
          name: item.name || "Unknown",
          stock_quantity: isNaN(parseInt(item.stock_quantity)) ? 0 : parseInt(item.stock_quantity),
          unit: item.unit || "pieces",
        }));
        console.log("Setting inventory:", validInventory);
        setInventory(validInventory);
      } else {
        console.warn("Inventory response is not an array:", inventoryData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Failed to load services - Check browser console for details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateProcedure = async () => {
    // Validate inputs
    if (!formData.name || formData.name.trim() === "") {
      Swal.fire({
        title: "Validation Error",
        text: "Service name is required",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
      return;
    }

    const price = parseFloat(String(formData.price));
    if (isNaN(price) || price <= 0) {
      Swal.fire({
        title: "Validation Error",
        text: "Please enter a valid price (must be greater than 0)",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
      return;
    }

    // Check for duplicate service name
    const nameLower = formData.name.trim().toLowerCase();
    const isDuplicate = allProcedures.some(
      (proc) => proc.name.toLowerCase() === nameLower && proc.id !== editingId
    );
    
    if (isDuplicate) {
      Swal.fire({
        title: "Service Already Exists",
        text: `Service "${formData.name}" already exists. Please use a different name.`,
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
      return;
    }

    // Check if equipment is assigned
    if (equipmentList.length === 0) {
      Swal.fire({
        title: "Validation Error",
        text: "Please assign at least one equipment/tool to this service",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
      return;
    }

    // Show confirmation for add/update
    const result = await Swal.fire({
      title: editingId ? "Update Service?" : "Add New Service?",
      html: `<div class="text-left">
        <p class="mb-2"><strong>Service Name:</strong> ${formData.name}</p>
        <p class="mb-2"><strong>Price:</strong> ₱${formatPrice(price)}</p>
        ${formData.description ? `<p class="mb-2"><strong>Description:</strong> ${formData.description}</p>` : ''}
      </div>
      <p>Are you sure you want to ${editingId ? 'update' : 'add'} this service?</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: editingId ? "Update" : "Add Service",
      cancelButtonText: "Cancel",
      confirmButtonColor: editingId ? "#3B82F6" : "#10B981",
      cancelButtonColor: "#6B7280",
      didOpen: setSwalZIndex,
    });

    if (!result.isConfirmed) return;

    try {
      setIsSaving(true);
      const url = editingId ? `/api/procedures/${editingId}` : "/api/procedures";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        name: formData.name.trim(),
        description: (formData.description || "").trim(),
        price: price,
        equipment: equipmentList.map(item => ({
          inventory_id: item.inventory_id,
          quantity_required: item.quantity
        }))
      };

      console.log("Sending payload:", payload);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();
      console.log("Response status:", response.status);
      console.log("Response data:", responseData);

      if (response.ok) {
        Swal.fire({
          title: "Success!",
          text: editingId ? "Service updated successfully" : "Service added successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: setSwalZIndex,
        });
        setFormData({ name: "", description: "", price: 0 });
        setEditingId(null);
        setShowAddForm(false);
        await fetchData();
      } else {
        try {
          const error = JSON.parse(responseData);
          Swal.fire({
            title: "Error",
            text: error.message || `Failed to save service (${response.status})`,
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: setSwalZIndex,
          });
        } catch {
          Swal.fire({
            title: "Error",
            text: `Failed to save service - ${response.status} ${response.statusText}`,
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: setSwalZIndex,
          });
        }
      }
    } catch (err) {
      console.error("Error saving procedure:", err);
      Swal.fire({
        title: "Error",
        text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProcedure = (procedure: Procedure) => {
    setFormData({
      name: procedure.name,
      description: procedure.description,
      price: procedure.price,
    });
    setEditingId(procedure.id);
    
    // Load existing equipment requirements
    if (procedure.requirements && procedure.requirements.length > 0) {
      const loadedEquipment = procedure.requirements.map((req: ProcedureRequirement) => {
        const inventoryItem = inventory.find(item => item.id === req.inventory_id);
        return {
          id: `req-${req.id}`,
          inventory_id: req.inventory_id,
          name: inventoryItem?.name || 'Unknown',
          quantity: req.quantity_required,
          unit: inventoryItem?.unit || '',
          stock_quantity: inventoryItem?.stock_quantity || 0
        };
      });
      setEquipmentList(loadedEquipment);
    } else {
      setEquipmentList([]);
    }
    
    setShowAddForm(true);
  };

  const handleDeleteProcedure = async (id: number) => {
    const procedure = procedures.find((p: Procedure) => p.id === id);
    if (!procedure) return;

    const result = await Swal.fire({
      title: "Delete Service?",
      html: `<div class="text-left">
        <p class="mb-2"><strong>Service Name:</strong> ${procedure.name}</p>
        <p class="mb-2"><strong>Price:</strong> ₱${formatPrice(procedure.price)}</p>
        <p class="mb-4 text-red-600 font-semibold">All associated equipment/tools will be removed.</p>
      </div>
      <p>Are you sure you want to delete this service?</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    if (!result.isConfirmed) return;

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: "Deleting service",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    try {
      setIsSaving(true);
      const response = await fetch(`/api/procedures/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const responseData = await response.text();
      Swal.close(); // Close loading alert
      
      if (response.ok) {
        Swal.fire({
          title: "Deleted!",
          text: "Service deleted successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: setSwalZIndex,
        });
        fetchData();
      } else {
        try {
          const error = JSON.parse(responseData);
          Swal.fire({
            title: "Error",
            text: error.message || "Failed to delete service",
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: setSwalZIndex,
          });
        } catch {
          Swal.fire({
            title: "Error",
            text: `Failed to delete service - ${response.status}`,
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: setSwalZIndex,
          });
        }
      }
    } catch (err) {
      console.error("Error deleting procedure:", err);
      Swal.fire({
        title: "Error",
        text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: setSwalZIndex,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRequirement = async () => {
    console.log("handleAddRequirement called with:", {
      inventory_id: requirementForm.inventory_id,
      quantity_required: requirementForm.quantity_required,
      selectedProcedure: selectedProcedureForRequirement,
    });

    if (!requirementForm.inventory_id || requirementForm.inventory_id === 0) {
      Swal.fire({
        title: "Missing Information",
        text: "Please select an equipment/tool",
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

    if (requirementForm.quantity_required < 1 || !requirementForm.quantity_required) {
      Swal.fire({
        title: "Invalid Quantity",
        text: "Please enter a valid quantity (minimum 1)",
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

    if (!selectedProcedureForRequirement) {
      Swal.fire({
        title: "No Service Selected",
        text: "Please select a service first",
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

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: "Adding equipment/tool",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    try {
      setIsSaving(true);
      const payload = {
        procedure_id: selectedProcedureForRequirement,
        inventory_id: requirementForm.inventory_id,
        quantity_required: requirementForm.quantity_required,
      };

      console.log("Sending payload:", payload);

      const response = await fetch("/api/procedure-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();
      console.log("Response status:", response.status, "Data:", responseData);

      if (response.ok) {
        Swal.close();
        Swal.fire({
          title: "Success!",
          text: "Equipment/Tool added successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
        console.log("Successfully created requirement!");
        setRequirementForm({ inventory_id: 0, quantity_required: 1 });
        setShowAddRequirement(false);
        // Refresh data immediately without delay
        fetchData().catch(err => console.error("Error refreshing data:", err));
      } else if (response.status === 409) {
        // Handle duplicate/conflict error
        Swal.close();
        try {
          const error = JSON.parse(responseData);
          console.warn("Duplicate equipment attempted:", error);
          Swal.fire({
            title: "Already Assigned",
            text: error.message || "This equipment/tool is already assigned to this service",
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: (modal) => {
              modal.style.zIndex = "999999";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
            },
          });
        } catch {
          Swal.fire({
            title: "Already Assigned",
            text: "This equipment/tool is already assigned to this service",
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: (modal) => {
              modal.style.zIndex = "999999";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
            },
          });
        }
      } else {
        Swal.close();
        try {
          const error = JSON.parse(responseData);
          console.error("API error response:", error);
          Swal.fire({
            title: "Error",
            text: error.message || `Failed to add equipment/tool (${response.status})`,
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: (modal) => {
              modal.style.zIndex = "999999";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
            },
          });
        } catch {
          console.error("Failed to parse error response:", responseData);
          Swal.fire({
            title: "Error",
            text: `Failed to add equipment/tool - ${response.status} ${response.statusText}`,
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
      }
    } catch (err) {
      console.error("Error adding requirement:", err);
      Swal.close();
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRequirement = (requirement: ProcedureRequirement) => {
    setEditingRequirementId(requirement.id);
    setRequirementForm({
      inventory_id: requirement.inventory_id,
      quantity_required: requirement.quantity_required,
    });
  };

  const handleUpdateRequirement = async () => {
    if (!editingRequirementId) return;

    if (requirementForm.quantity_required < 1 || !requirementForm.quantity_required) {
      Swal.fire({
        title: "Invalid Quantity",
        text: "Please enter a valid quantity (minimum 1)",
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

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: "Updating equipment/tool quantity",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    try {
      setIsSaving(true);
      const response = await fetch(`/api/procedure-requirements/${editingRequirementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quantity_required: requirementForm.quantity_required,
        }),
      });

      if (response.ok) {
        Swal.close();
        Swal.fire({
          title: "Success!",
          text: "Equipment/Tool quantity updated successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
        setEditingRequirementId(null);
        setRequirementForm({ inventory_id: 0, quantity_required: 1 });
        fetchData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Swal.close();
        Swal.fire({
          title: "Error",
          text: errorData.message || "Failed to update equipment/tool",
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
      console.error("Error updating requirement:", err);
      Swal.close();
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditRequirement = () => {
    setEditingRequirementId(null);
    setRequirementForm({ inventory_id: 0, quantity_required: 1 });
  };

  const handleDeleteRequirement = async (requirementId: number) => {
    const result = await Swal.fire({
      title: "Remove Equipment/Tool?",
      text: "Are you sure you want to remove this equipment/tool from the service?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6B7280",
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    if (!result.isConfirmed) return;

    // Show loading state
    Swal.fire({
      title: "Processing...",
      text: "Removing equipment/tool",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        modal.style.zIndex = "999999";
        const backdrop = document.querySelector(".swal2-container");
        if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
      },
    });

    try {
      setIsSaving(true);
      const response = await fetch(`/api/procedure-requirements/${requirementId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const responseData = await response.text();

      if (response.ok) {
        Swal.fire({
          title: "Removed!",
          text: "Equipment/Tool removed successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
        fetchData();
      } else {
        try {
          const error = JSON.parse(responseData);
          Swal.fire({
            title: "Error",
            text: error.message || "Failed to remove equipment/tool",
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: (modal) => {
              modal.style.zIndex = "999999";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
            },
          });
        } catch {
          Swal.fire({
            title: "Error",
            text: `Failed to remove equipment/tool - ${response.status}`,
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
      }
    } catch (err) {
      console.error("Error deleting requirement:", err);
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
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProcedures = procedures.filter((proc: Procedure) => {
    const matchesSearch = proc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedProcedures = [...filteredProcedures].sort((a, b) => {
    let compareResult = 0;
    if (sortBy === "name") {
      compareResult = a.name.localeCompare(b.name);
    } else if (sortBy === "price") {
      compareResult = a.price - b.price;
    }
    return sortOrder === "asc" ? compareResult : -compareResult;
  });

  const handleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === sortedProcedures.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(sortedProcedures.map((proc) => proc.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Services Selected",
        text: "Please select at least one service to delete.",
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
      title: "Delete Selected Services?",
      html: `<p>Are you sure you want to delete <strong>${selectedItems.length}</strong> service(s)?</p>
             <p class="text-sm text-gray-500 mt-2">This action cannot be undone. All associated equipment/tools will be removed.</p>`,
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
      setIsSaving(true);
      const deletePromises = selectedItems.map((id) =>
        fetch(`/api/procedures/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
      );

      await Promise.all(deletePromises);

      Swal.fire({
        title: "Deleted!",
        text: `${selectedItems.length} service(s) have been deleted successfully.`,
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
      setSelectMode(false);
      fetchData();
    } catch (err) {
      console.error("Error deleting services:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to delete some services. Please try again.",
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
      setIsSaving(false);
    }
  };

  const getAvailabilityColor = (isAvailable: boolean | undefined) => {
    if (isAvailable === false)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const getAvailabilityText = (isAvailable: boolean | undefined) => {
    return isAvailable === false ? "Stock Low / Unavailable" : "Available";
  };

  const formatPrice = (price: any): string => {
    try {
      const numPrice = parseFloat(price);
      return isNaN(numPrice) ? "0.00" : numPrice.toFixed(2);
    } catch {
      return "0.00";
    }
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
      <PageMeta title="Manage Services "  />
      <PageBreadcrumb pageTitle="Manage Services" />

      <div className="space-y-6 p-4 lg:p-6">
        {/* HEADER WITH SEARCH & ADD BUTTON */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
            <div className="flex-1 w-full lg:w-auto">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Dental Services</h2>
            </div>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (editingId) {
                  setEditingId(null);
                  setFormData({ name: "", description: "", price: 0 });
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {showAddForm ? "Cancel" : "+ Add Service"}
            </button>
          </div>

          {/* ADD/EDIT MODAL */}
          <Modal isOpen={showAddForm} onClose={() => {
            setShowAddForm(false);
            setEditingId(null);
            setFormData({ name: "", description: "", price: 0 });
            setEquipmentList([]);
            setEquipmentInput({ inventory_id: 0, quantity: 1 });
          }} className="max-w-lg p-6">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                {editingId ? "Edit Service" : "Add New Service"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Root Canal Treatment"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    placeholder="Service price"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Service description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 h-24"
                  />
                </div>

                {/* Equipment/Tools Section */}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Equipment & Tools Required
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const equipmentHTML = `
                          <div class="space-y-4 text-left">
                            <div>
                              <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Select Equipment</label>
                              <select id="equipmentSelect" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                                <option value="">-- Select Equipment --</option>
                                ${inventory.length > 0 ? inventory.map((item) => `<option value="${item.id}|${item.name}|${item.unit}|${item.stock_quantity}" ${item.stock_quantity === 0 ? 'disabled' : ''}>${item.name} (Stock: ${item.stock_quantity} ${item.unit})${item.stock_quantity === 0 ? ' - Out of Stock' : ''}</option>`).join("") : '<option value="">No inventory available</option>'}
                              </select>
                            </div>
                            <div>
                              <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Required Quantity</label>
                              <input id="equipmentQty" type="number" placeholder="1" min="1" value="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                          </div>
                        `;
                        
                        Swal.fire({
                          title: "Add Equipment",
                          html: equipmentHTML,
                          showCancelButton: true,
                          confirmButtonText: "Add",
                          cancelButtonText: "Cancel",
                          confirmButtonColor: "#16A34A",
                          cancelButtonColor: "#6B7280",
                          didOpen: (modal) => {
                            setSwalZIndex(modal);
                            // Focus on the select element
                            setTimeout(() => {
                              const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                              select?.focus();
                            }, 100);
                          },
                          preConfirm: () => {
                            const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                            const qty = document.getElementById("equipmentQty") as HTMLInputElement;
                            
                            if (!select?.value) {
                              Swal.showValidationMessage("Please select an equipment");
                              return false;
                            }
                            
                            if (!qty?.value || parseInt(qty.value) < 1) {
                              Swal.showValidationMessage("Please enter a valid quantity");
                              return false;
                            }
                            
                            const [id, name, unit, stock] = select.value.split("|");
                            return { id: parseInt(id), name, unit, stock: parseInt(stock), qty: parseInt(qty.value) };
                          }
                        }).then((result) => {
                          if (result.isConfirmed && result.value) {
                            const { id, name, unit, stock, qty } = result.value;
                            
                            // Check if equipment already exists
                            const existingIndex = equipmentList.findIndex(item => item.inventory_id === id);
                            
                            if (existingIndex !== -1) {
                              // Equipment already exists, show alert
                              Swal.fire({
                                title: "Already Added",
                                text: `${name} is already in the equipment list.`,
                                icon: "warning",
                                confirmButtonText: "OK",
                                confirmButtonColor: "#F59E0B",
                                didOpen: setSwalZIndex,
                              });
                            } else {
                              // New equipment, add it
                              setEquipmentList([...equipmentList, { 
                                id: Date.now().toString(), 
                                inventory_id: id,
                                name: name, 
                                quantity: qty,
                                unit: unit,
                                stock_quantity: parseInt(stock)
                              }]);
                            }
                          }
                        });
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Equipment List */}
                  <div className="space-y-2">
                    {equipmentList.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No equipment assigned yet</p>
                    ) : (
                      equipmentList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
                        >
                          {editingEquipmentId === item.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</h4>
                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editingEquipmentQty}
                                  onChange={(e) => setEditingEquipmentQty(parseInt(e.target.value) || 1)}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm w-24 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</span>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEquipmentList(equipmentList.map((e) =>
                                      e.id === item.id ? { ...e, quantity: editingEquipmentQty } : e
                                    ));
                                    setEditingEquipmentId(null);
                                    setEditingEquipmentQty(1);
                                  }}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEquipmentId(null);
                                    setEditingEquipmentQty(1);
                                  }}
                                  className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Required: {item.quantity} {item.unit} | Stock: {item.stock_quantity} {item.unit}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEquipmentId(item.id);
                                    setEditingEquipmentQty(item.quantity);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEquipmentList(equipmentList.filter((e) => e.id !== item.id))}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAddOrUpdateProcedure}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({ name: "", description: "", price: 0 });
                    setEquipmentList([]);
                    setEquipmentInput({ inventory_id: 0, quantity: 1 });
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>

          {/* SEARCH & SORT */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6 items-start lg:items-center">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search services..."
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
                <option value="price">Sort by Price</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              {/* SELECT BUTTON */}
              {sortedProcedures.length > 0 && !selectMode && (
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
          {selectMode && sortedProcedures.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedItems.length === sortedProcedures.length && sortedProcedures.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedItems.length === 0
                    ? "Select All"
                    : selectedItems.length === sortedProcedures.length
                    ? `All ${selectedItems.length} selected`
                    : `${selectedItems.length} selected`}
                </span>
              </div>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isSaving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
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

          {/* PROCEDURES LIST */}
          {sortedProcedures.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No services found
            </div>
          ) : viewType === "cards" ? (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProcedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className={`rounded-lg border ${
                    selectMode && selectedItems.includes(procedure.id)
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 bg-white dark:bg-gray-800"
                      : procedure.isAvailable === false
                      ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
                      : "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                  } p-4 hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(procedure.id)}
                          onChange={() => handleSelectItem(procedure.id)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                      <h4 className="font-semibold text-gray-800 dark:text-white">{procedure.name}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAvailabilityColor(procedure.isAvailable)}`}>
                      {getAvailabilityText(procedure.isAvailable)}
                    </span>
                  </div>
                  {procedure.description && (
                    <p className={`text-sm text-gray-500 dark:text-gray-400 mb-3 ${selectMode ? "ml-8" : ""}`}>
                      {procedure.description}
                    </p>
                  )}
                  <div className={`mb-4 ${selectMode ? "ml-8" : ""}`}>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">₱{formatPrice(procedure.price)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Service Price</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setExpandedProcedure(expandedProcedure === procedure.id ? null : procedure.id)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-semibold transition-colors"
                    >
                      {expandedProcedure === procedure.id ? "Hide" : "Equipment"}
                    </button>
                    <button
                      onClick={() => handleEditProcedure(procedure)}
                      disabled={isSaving}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs rounded-lg font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProcedure(procedure.id)}
                      disabled={isSaving}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs rounded-lg font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  
                  {/* EXPANDED REQUIREMENTS IN CARD */}
                  {expandedProcedure === procedure.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-semibold text-sm text-gray-800 dark:text-white">Equipment & Tools</h5>
                        <button
                          onClick={() => {
                            setSelectedProcedureForRequirement(procedure.id);
                            const equipmentHTML = `
                              <div class="space-y-4 text-left">
                                <div>
                                  <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Select Equipment</label>
                                  <select id="equipmentSelect" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                                    <option value="">-- Select Equipment --</option>
                                    ${inventory.length > 0 ? inventory.map((item) => `<option value="${item.id}|${item.name}|${item.unit}|${item.stock_quantity}" ${item.stock_quantity === 0 ? 'disabled' : ''}>${item.name} (Stock: ${item.stock_quantity} ${item.unit})${item.stock_quantity === 0 ? ' - Out of Stock' : ''}</option>`).join("") : '<option value="">No inventory available</option>'}
                                  </select>
                                </div>
                                <div>
                                  <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Required Quantity</label>
                                  <input id="equipmentQty" type="number" placeholder="1" min="1" value="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                                </div>
                              </div>
                            `;
                            
                            Swal.fire({
                              title: "Add Equipment",
                              html: equipmentHTML,
                              showCancelButton: true,
                              confirmButtonText: "Add",
                              cancelButtonText: "Cancel",
                              confirmButtonColor: "#16A34A",
                              cancelButtonColor: "#6B7280",
                              didOpen: (modal) => {
                                setSwalZIndex(modal);
                                // Focus on the select element
                                setTimeout(() => {
                                  const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                                  select?.focus();
                                }, 100);
                              },
                              preConfirm: () => {
                                const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                                const qty = document.getElementById("equipmentQty") as HTMLInputElement;
                                
                                if (!select?.value) {
                                  Swal.showValidationMessage("Please select an equipment");
                                  return false;
                                }
                                
                                if (!qty?.value || parseInt(qty.value) < 1) {
                                  Swal.showValidationMessage("Please enter a valid quantity");
                                  return false;
                                }
                                
                                const [id, name, unit, stock] = select.value.split("|");
                                return { id: parseInt(id), name, unit, stock: parseInt(stock), qty: parseInt(qty.value) };
                              }
                            }).then((result) => {
                              if (result.isConfirmed && result.value) {
                                const { id, name, unit, stock, qty } = result.value;
                                setSelectedProcedureForRequirement(procedure.id);
                                setRequirementForm({
                                  inventory_id: id,
                                  quantity_required: qty
                                });
                                handleAddRequirement();
                              }
                            });
                          }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors"
                        >
                          + Add
                        </button>
                      </div>



                      {(editingId === procedure.id && equipmentList.length > 0) || (procedure.requirements && procedure.requirements.length > 0) ? (
                        <div className="space-y-2">
                          {editingId === procedure.id ? (
                            // Show equipment from modal when editing
                            equipmentList.map((item) => (
                              <div key={item.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                {editingEquipmentId === item.id ? (
                                  // Edit Mode
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-gray-700 dark:text-gray-400">Qty:</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={editingEquipmentQty}
                                        onChange={(e) => setEditingEquipmentQty(parseInt(e.target.value) || 1)}
                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-xs w-20 focus:outline-none focus:border-blue-500"
                                      />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{item.unit}</span>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEquipmentList(equipmentList.map((e) =>
                                            e.id === item.id ? { ...e, quantity: editingEquipmentQty } : e
                                          ));
                                          setEditingEquipmentId(null);
                                          setEditingEquipmentQty(1);
                                        }}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEquipmentId(null);
                                          setEditingEquipmentQty(1);
                                        }}
                                        className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Required: {item.quantity} {item.unit} | Stock: {item.stock_quantity} {item.unit}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEquipmentId(item.id);
                                          setEditingEquipmentQty(item.quantity);
                                        }}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEquipmentList(equipmentList.filter((e) => e.id !== item.id))}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            // Show procedure requirements when not editing
                            procedure.requirements?.map((req: ProcedureRequirement) => {
                              const inventoryItem = inventory.find((inv) => inv.id === req.inventory_id);
                              const isLowStock = inventoryItem && inventoryItem.stock_quantity < req.quantity_required;
                              return (
                                <div key={req.id} className={`flex items-center justify-between ${isLowStock ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"} rounded-lg p-3`}>
                                  <div>
                                    <p className={`text-sm font-semibold ${isLowStock ? "text-red-700 dark:text-red-300" : "text-gray-800 dark:text-white"}`}>
                                      {inventoryItem?.name}
                                    </p>
                                    <p className={`text-xs ${isLowStock ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                                      Required: {req.quantity_required} {inventoryItem?.unit} | Stock: {inventoryItem?.stock_quantity} {inventoryItem?.unit}
                                      {isLowStock && " ⚠️"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No equipment assigned</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-3">
              {sortedProcedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className={`rounded-lg border ${
                    selectMode && selectedItems.includes(procedure.id)
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 bg-gray-50 dark:bg-gray-800"
                      : procedure.isAvailable === false
                      ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
                      : "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                  } hover:shadow-md transition-all`}
                >
                  {/* MAIN PROCEDURE INFO */}
                  <div className="p-4 lg:p-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 w-full lg:w-auto">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(procedure.id)}
                            onChange={() => handleSelectItem(procedure.id)}
                            className="w-5 h-5 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-lg text-gray-800 dark:text-white">
                            {procedure.name}
                          </h4>
                          {procedure.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {procedure.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            ₱{formatPrice(procedure.price)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Service Price</p>
                        </div>
                      </div>
                    </div>

                    {/* STATUS & ACTIONS */}
                    <div className={`flex flex-wrap items-center gap-2 mt-4 ${selectMode ? "ml-9" : ""}`}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getAvailabilityColor(
                          procedure.isAvailable
                        )}`}
                      >
                        {getAvailabilityText(procedure.isAvailable)}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedProcedure(
                            expandedProcedure === procedure.id ? null : procedure.id
                          )
                        }
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        {expandedProcedure === procedure.id
                          ? "Hide Equipment/Tools"
                          : "Show Equipment/Tools"}
                      </button>
                      <button
                        onClick={() => handleEditProcedure(procedure)}
                        disabled={isSaving}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProcedure(procedure.id)}
                        disabled={isSaving}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED REQUIREMENTS SECTION */}
                  {expandedProcedure === procedure.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 lg:p-6 bg-white dark:bg-gray-900">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-semibold text-gray-800 dark:text-white">
                          Equipment & Tools Required
                        </h5>
                        <button
                          onClick={() => {
                            setSelectedProcedureForRequirement(procedure.id);
                            const equipmentHTML = `
                              <div class="space-y-4 text-left">
                                <div>
                                  <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Select Equipment</label>
                                  <select id="equipmentSelect" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                                    <option value="">-- Select Equipment --</option>
                                    ${inventory.length > 0 ? inventory.map((item) => `<option value="${item.id}|${item.name}|${item.unit}|${item.stock_quantity}" ${item.stock_quantity === 0 ? 'disabled' : ''}>${item.name} (Stock: ${item.stock_quantity} ${item.unit})${item.stock_quantity === 0 ? ' - Out of Stock' : ''}</option>`).join("") : '<option value="">No inventory available</option>'}
                                  </select>
                                </div>
                                <div>
                                  <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Required Quantity</label>
                                  <input id="equipmentQty" type="number" placeholder="1" min="1" value="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                                </div>
                              </div>
                            `;
                            
                            Swal.fire({
                              title: "Add Equipment",
                              html: equipmentHTML,
                              showCancelButton: true,
                              confirmButtonText: "Add",
                              cancelButtonText: "Cancel",
                              confirmButtonColor: "#16A34A",
                              cancelButtonColor: "#6B7280",
                              didOpen: (modal) => {
                                setSwalZIndex(modal);
                                // Focus on the select element
                                setTimeout(() => {
                                  const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                                  select?.focus();
                                }, 100);
                              },
                              preConfirm: () => {
                                const select = document.getElementById("equipmentSelect") as HTMLSelectElement;
                                const qty = document.getElementById("equipmentQty") as HTMLInputElement;
                                
                                if (!select?.value) {
                                  Swal.showValidationMessage("Please select an equipment");
                                  return false;
                                }
                                
                                if (!qty?.value || parseInt(qty.value) < 1) {
                                  Swal.showValidationMessage("Please enter a valid quantity");
                                  return false;
                                }
                                
                                const [id, name, unit, stock] = select.value.split("|");
                                return { id: parseInt(id), name, unit, stock: parseInt(stock), qty: parseInt(qty.value) };
                              }
                            }).then((result) => {
                              if (result.isConfirmed && result.value) {
                                const { id, name, unit, stock, qty } = result.value;
                                setSelectedProcedureForRequirement(procedure.id);
                                setRequirementForm({
                                  inventory_id: id,
                                  quantity_required: qty
                                });
                                handleAddRequirement();
                              }
                            });
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-semibold transition-colors"
                        >
                          + Add
                        </button>
                      </div>



                      {/* REQUIREMENTS LIST */}
                      {(editingId === procedure.id && equipmentList.length > 0) || (procedure.requirements && procedure.requirements.length > 0) ? (
                        <div className="space-y-2">
                          {editingId === procedure.id ? (
                            // Show equipment from modal when editing
                            equipmentList.map((item) => (
                              <div
                                key={item.id}
                                className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              >
                                {editingEquipmentId === item.id ? (
                                  // Edit Mode
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-green-800 dark:text-green-300">{item.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm text-gray-700 dark:text-gray-300">Qty:</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={editingEquipmentQty}
                                        onChange={(e) => setEditingEquipmentQty(parseInt(e.target.value) || 1)}
                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm w-20 focus:outline-none focus:border-blue-500"
                                      />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</span>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEquipmentList(equipmentList.map((e) =>
                                            e.id === item.id ? { ...e, quantity: editingEquipmentQty } : e
                                          ));
                                          setEditingEquipmentId(null);
                                          setEditingEquipmentQty(1);
                                        }}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEquipmentId(null);
                                          setEditingEquipmentQty(1);
                                        }}
                                        className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-green-800 dark:text-green-300">{item.name}</p>
                                      <p className="text-sm text-green-700 dark:text-green-400">
                                        Required: {item.quantity} {item.unit} | Stock: {item.stock_quantity} {item.unit}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEquipmentId(item.id);
                                          setEditingEquipmentQty(item.quantity);
                                        }}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEquipmentList(equipmentList.filter((e) => e.id !== item.id))}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            // Show procedure requirements when not editing
                            procedure.requirements?.map((req: ProcedureRequirement) => {
                              const inventoryItem = inventory.find(
                                (inv) => inv.id === req.inventory_id
                              );
                              const isLowStock =
                                inventoryItem &&
                                inventoryItem.stock_quantity < req.quantity_required;
                              const isEditing = editingRequirementId === req.id;

                              return (
                                <div
                                  key={req.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    isLowStock
                                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <p
                                      className={`font-medium ${
                                        isLowStock
                                          ? "text-red-800 dark:text-red-300"
                                          : "text-green-800 dark:text-green-300"
                                      }`}
                                    >
                                      {inventoryItem?.name}
                                    </p>
                                    {isEditing ? (
                                      <div className="mt-2 flex items-center gap-2">
                                        <label className="text-sm text-gray-700 dark:text-gray-300">
                                          Qty:
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={requirementForm.quantity_required}
                                          onChange={(e) =>
                                            setRequirementForm({
                                              ...requirementForm,
                                              quantity_required: parseInt(e.target.value),
                                            })
                                          }
                                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {inventoryItem?.unit}
                                        </span>
                                      </div>
                                    ) : (
                                      <p
                                        className={`text-sm ${
                                          isLowStock
                                            ? "text-red-700 dark:text-red-400"
                                            : "text-green-700 dark:text-green-400"
                                        }`}
                                      >
                                        Required: {req.quantity_required} {inventoryItem?.unit} | Stock:{" "}
                                        {inventoryItem?.stock_quantity} {inventoryItem?.unit}
                                        {isLowStock && " ⚠️ LOW"}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={handleUpdateRequirement}
                                          disabled={isSaving}
                                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEditRequirement}
                                          disabled={isSaving}
                                          className="px-3 py-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditRequirement(req)}
                                          disabled={isSaving}
                                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRequirement(req.id)}
                                          disabled={isSaving}
                                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
                                        >
                                          Remove
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                          No equipment/tools assigned yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {!loading && procedures.length > 0 && (
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
                  Showing {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, totalProcedures)} of {totalProcedures}
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
                    // Show first page, last page, current page, and pages around current page
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
