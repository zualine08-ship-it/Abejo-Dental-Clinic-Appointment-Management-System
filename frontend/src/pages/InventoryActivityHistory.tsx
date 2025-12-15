import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../hooks/useToast";

interface InventoryActivity {
  id: number;
  activity_type: string;
  quantity_changed: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface ActivityHistoryData {
  inventory: {
    id: number;
    name: string;
    current_stock: number;
    last_restock_date: string | null;
  };
  activities: InventoryActivity[];
}

export default function InventoryActivityHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState<ActivityHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchActivityHistory(parseInt(id));
    }
  }, [id]);

  const fetchActivityHistory = async (inventoryId: number) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/inventory/${inventoryId}/activities`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activity history (${response.status})`);
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load activity history";
      showToast(errorMessage, "error");
      navigate("/reports/inventory");
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "added":
        return "+";
      case "used":
        return "-";
      case "restocked":
        return "↻";
      default:
        return "•";
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "added":
        return "text-green-600 dark:text-green-400";
      case "used":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">No activity history found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Hidden when printing */}
      <div className="print:hidden bg-sky-50 dark:bg-sky-900/30 border-b border-sky-200 dark:border-sky-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-sky-200 dark:border-sky-700 px-4 py-3 flex items-center justify-between gap-4">
            <button
              onClick={() => navigate("/inventoryreport")}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Report
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity History</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                <span className="font-medium">{historyData.inventory.name}</span> - Current Stock: {historyData.inventory.current_stock}
                {historyData.inventory.last_restock_date && (
                  <span className="ml-2">| Last Restocked: {new Date(historyData.inventory.last_restock_date).toLocaleDateString()}</span>
                )}
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block p-8 border-b border-gray-300">
        <h1 className="text-3xl font-bold text-center mb-4">Inventory Activity History Report</h1>
        <div className="text-center text-sm text-gray-600 space-y-1">
          <p><strong>Item:</strong> {historyData.inventory.name}</p>
          <p><strong>Current Stock:</strong> {historyData.inventory.current_stock}</p>
          {historyData.inventory.last_restock_date && (
            <p><strong>Last Restocked:</strong> {new Date(historyData.inventory.last_restock_date).toLocaleDateString()}</p>
          )}
          <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
          <p><strong>Total Activities:</strong> {historyData.activities.length}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {historyData.activities.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm print:border-2">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-sky-100 dark:bg-sky-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Activity #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Activity Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Previous Qty
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    New Qty
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Qty Changed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider print:text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {historyData.activities.map((activity, index) => (
                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 print:break-inside-avoid">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 print:text-black">
                      #{historyData.activities.length - index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${getActivityColor(activity.activity_type)} print:text-black`}>
                          {getActivityIcon(activity.activity_type)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize print:text-black">
                            {activity.activity_type}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-700">
                            {activity.reason}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 print:text-black">
                      {new Date(activity.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {activity.previous_quantity ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {activity.new_quantity ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`text-sm font-bold ${
                          activity.quantity_changed > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        } print:text-black`}
                      >
                        {activity.quantity_changed > 0 ? "+" : ""}
                        {activity.quantity_changed}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          activity.status === "Low Stock"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        } print:border print:border-gray-400 print:text-black`}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No activity history found for this item.</p>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block fixed bottom-0 left-0 right-0 p-4 border-t border-gray-300 text-center text-xs text-gray-600">
        <p>Page generated on {new Date().toLocaleString()} | Abejo AMS - Inventory Management System</p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          @page {
            margin: 0.5in;
          }
          /* Hide sidebar and header */
          aside, 
          header,
          nav,
          .sidebar,
          [class*="sidebar"],
          [class*="Sidebar"],
          button[aria-label="Toggle sidebar"],
          button[aria-label="Menu"] {
            display: none !important;
          }
          /* Remove extra margins/padding from layout */
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
