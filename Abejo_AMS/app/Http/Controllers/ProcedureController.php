<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Procedure;
use App\Models\ProcedureRequirement;

class ProcedureController extends Controller
{
    // List all procedures with pagination
    public function index(Request $request) {
        $perPage = $request->query('per_page', 10);
        $page = $request->query('page', 1);
        $search = $request->query('search', '');
        $sortBy = $request->query('sort_by', 'name');
        $sortOrder = $request->query('sort_order', 'asc');
        
        $query = Procedure::with('requirements.inventory');
        
        // Apply search filter
        if ($search) {
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
        }
        
        // Apply sorting
        if (in_array($sortBy, ['name', 'price', 'created_at'])) {
            $query->orderBy($sortBy, $sortOrder === 'desc' ? 'desc' : 'asc');
        }
        
        $procedures = $query->paginate($perPage, ['*'], 'page', $page);
        return response()->json($procedures, 200);
    }

    // Check which procedures have sufficient inventory
    public function checkAvailability() {
        $procedures = Procedure::with('requirements.inventory')->get();
        $availability = [];

        foreach ($procedures as $procedure) {
            $isAvailable = true;
            
            // Check if all required inventory items have sufficient stock
            foreach ($procedure->requirements as $requirement) {
                if ($requirement->inventory->stock_quantity < $requirement->quantity_required) {
                    $isAvailable = false;
                    break;
                }
            }
            
            $availability[$procedure->id] = $isAvailable;
        }

        return response()->json($availability, 200);
    }

    // Create procedure
    public function store(Request $request) {
        $request->validate([
            'name' => 'required',
            'price' => 'required|numeric',
        ]);

        $procedureData = $request->only(['name', 'description', 'price']);
        $procedure = Procedure::create($procedureData);

        // Handle equipment/requirements
        if ($request->has('equipment') && is_array($request->equipment)) {
            foreach ($request->equipment as $equipmentItem) {
                ProcedureRequirement::create([
                    'procedure_id' => $procedure->id,
                    'inventory_id' => $equipmentItem['inventory_id'],
                    'quantity_required' => $equipmentItem['quantity_required'],
                ]);
            }
        }

        // Reload with requirements
        $procedure->load('requirements.inventory');
        return response()->json($procedure, 201);
    }

    // Show single procedure
    public function show($id) {
        $procedure = Procedure::with('requirements.inventory')->findOrFail($id);
        return response()->json($procedure, 200);
    }

    // Update procedure
    public function update(Request $request, $id) {
        $procedure = Procedure::findOrFail($id);
        $procedureData = $request->only(['name', 'description', 'price']);
        $procedure->update($procedureData);

        // Handle equipment/requirements
        if ($request->has('equipment') && is_array($request->equipment)) {
            // Delete existing requirements
            $procedure->requirements()->delete();

            // Create new requirements
            foreach ($request->equipment as $equipmentItem) {
                ProcedureRequirement::create([
                    'procedure_id' => $procedure->id,
                    'inventory_id' => $equipmentItem['inventory_id'],
                    'quantity_required' => $equipmentItem['quantity_required'],
                ]);
            }
        }

        // Reload with requirements
        $procedure->load('requirements.inventory');
        return response()->json($procedure, 200);
    }

    // Delete procedure
    public function destroy($id) {
        $procedure = Procedure::findOrFail($id);
        $procedure->delete();
        return response()->json(['message'=>'Deleted successfully'], 200);
    }
}
