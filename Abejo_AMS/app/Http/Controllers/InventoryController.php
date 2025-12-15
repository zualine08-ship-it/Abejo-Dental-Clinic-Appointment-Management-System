<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Inventory;
use App\Models\InventoryActivity;
use App\Models\User;
use App\Services\NotificationService;

class InventoryController extends Controller
{
    public function index(Request $request) {
        $perPage = $request->query('per_page', 10);
        $page = $request->query('page', 1);
        $search = $request->query('search', '');
        $sortBy = $request->query('sort_by', 'name');
        $sortOrder = $request->query('sort_order', 'asc');
        
        $query = Inventory::query();
        
        // Apply search filter
        if ($search) {
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhere('unit', 'like', '%' . $search . '%');
        }
        
        // Apply sorting
        if (in_array($sortBy, ['name', 'stock_quantity', 'unit', 'created_at', 'last_restock_date'])) {
            $query->orderBy($sortBy, $sortOrder === 'desc' ? 'desc' : 'asc');
        }
        
        $inventory = $query->paginate($perPage, ['*'], 'page', $page);
        return response()->json($inventory, 200);
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required',
            'stock_quantity' => 'required|integer|min:0',
            'unit' => 'required|string',
            'min_quantity' => 'integer|min:0',
        ]);

        $inventory = Inventory::create([
            'name' => $request->name,
            'stock_quantity' => $request->stock_quantity,
            'unit' => $request->unit,
            'min_quantity' => $request->min_quantity ?? 10,
            'last_restock_date' => now(),
        ]);

        // Log the activity
        if ($request->stock_quantity > 0) {
            InventoryActivity::create([
                'inventory_id' => $inventory->id,
                'activity_type' => 'added',
                'quantity_changed' => $request->stock_quantity,
                'previous_quantity' => 0,
                'new_quantity' => $request->stock_quantity,
                'reason' => 'initial',
                'notes' => 'Initial stock entry',
            ]);
        }

        return response()->json($inventory, 201);
    }

    public function update(Request $request, $id) {
        $inventory = Inventory::findOrFail($id);
        $oldStock = $inventory->stock_quantity;
        
        $request->validate([
            'name' => 'required',
            'stock_quantity' => 'required|integer|min:0',
            'unit' => 'required|string',
            'min_quantity' => 'integer|min:0',
        ]);
        
        $newStock = $request->stock_quantity;
        $quantityChanged = $newStock - $oldStock;

        // Determine activity type and reason
        if ($quantityChanged > 0) {
            $activityType = 'added';
            $reason = 'restock';
            // Update last_restock_date when stock is added
            $inventory->last_restock_date = now();
        } else if ($quantityChanged < 0) {
            $activityType = 'used';
            $reason = 'usage';
        } else {
            $activityType = 'updated';
            $reason = 'quantity_adjustment';
        }

        // Log the activity before updating
        if ($quantityChanged != 0) {
            InventoryActivity::create([
                'inventory_id' => $id,
                'activity_type' => $activityType,
                'quantity_changed' => $quantityChanged,
                'previous_quantity' => $oldStock,
                'new_quantity' => $newStock,
                'reason' => $reason,
                'notes' => $request->notes ?? null,
            ]);
        }

        $inventory->update([
            'name' => $request->name,
            'stock_quantity' => $newStock,
            'unit' => $request->unit,
            'min_quantity' => $request->min_quantity ?? 10,
            'last_restock_date' => $inventory->last_restock_date,
        ]);

        $minQuantity = $inventory->min_quantity ?? 10;
        
        // Notify admins about stock changes
        $admins = User::where('role', 'admin')->orWhere('role', 'staff')->get();
        
        if ($newStock === 0 && $oldStock > 0) {
            // Item just went out of stock
            foreach ($admins as $admin) {
                NotificationService::notifyOutOfStock($admin, $inventory->name);
            }
        } elseif ($newStock > 0 && $newStock <= $minQuantity && $oldStock > $minQuantity) {
            // Item just dropped to low stock
            foreach ($admins as $admin) {
                NotificationService::notifyLowInventory($admin, $inventory->name, $newStock, $minQuantity);
            }
        }
        
        return response()->json($inventory, 200);
    }

    public function destroy($id) {
        $inventory = Inventory::findOrFail($id);
        $inventory->delete();
        return response()->json(['message' => 'Inventory item deleted successfully'], 200);
    }

    public function getActivities($id) {
        $inventory = Inventory::findOrFail($id);
        
        // Fetch all activities for this inventory item, ordered by most recent first
        $activities = InventoryActivity::where('inventory_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($activity) use ($inventory) {
                // Calculate status at the time of this activity
                $status = $activity->new_quantity < ($inventory->min_quantity ?? 10) ? 'Low Stock' : 'In Stock';
                
                return [
                    'id' => $activity->id,
                    'activity_type' => $activity->activity_type,
                    'quantity_changed' => $activity->quantity_changed,
                    'previous_quantity' => $activity->previous_quantity,
                    'new_quantity' => $activity->new_quantity,
                    'reason' => $activity->reason,
                    'notes' => $activity->notes,
                    'status' => $status,
                    'created_at' => $activity->created_at,
                ];
            });
        
        return response()->json([
            'inventory' => [
                'id' => $inventory->id,
                'name' => $inventory->name,
                'current_stock' => $inventory->stock_quantity,
                'last_restock_date' => $inventory->last_restock_date,
            ],
            'activities' => $activities
        ], 200);
    }
}
