<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProcedureRequirement;
use Illuminate\Support\Facades\Log;

class ProcedureRequirementController extends Controller
{
    public function index() {
        return response()->json(ProcedureRequirement::with('inventory')->get(), 200);
    }

    public function store(Request $request) {
        try {
            Log::info('Creating procedure requirement with data:', $request->all());
            
            $validated = $request->validate([
                'procedure_id' => 'required|exists:procedures,id',
                'inventory_id' => 'required|exists:inventories,id',
                'quantity_required' => 'required|integer|min:1',
            ]);

            Log::info('Validation passed:', $validated);

            // Check for duplicate - same equipment already assigned to this procedure
            $existingRequirement = ProcedureRequirement::where('procedure_id', $validated['procedure_id'])
                ->where('inventory_id', $validated['inventory_id'])
                ->first();

            if ($existingRequirement) {
                Log::warning('Duplicate requirement attempted:', [
                    'procedure_id' => $validated['procedure_id'],
                    'inventory_id' => $validated['inventory_id'],
                    'existing_id' => $existingRequirement->id
                ]);
                return response()->json([
                    'message' => 'This equipment/tool is already assigned to this procedure',
                    'existing_id' => $existingRequirement->id
                ], 409); // 409 Conflict status code
            }

            $requirement = ProcedureRequirement::create($validated);
            
            Log::info('Requirement created successfully:', $requirement->toArray());
            
            return response()->json($requirement, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error:', $e->errors());
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error creating procedure requirement:', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to create requirement', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id) {
        $requirement = ProcedureRequirement::with('inventory')->findOrFail($id);
        return response()->json($requirement, 200);
    }

    public function update(Request $request, $id) {
        $requirement = ProcedureRequirement::findOrFail($id);
        
        $request->validate([
            'procedure_id' => 'sometimes|exists:procedures,id',
            'inventory_id' => 'sometimes|exists:inventory,id',
            'quantity_required' => 'sometimes|integer|min:1',
        ]);

        $requirement->update($request->all());
        return response()->json($requirement, 200);
    }

    public function destroy($id) {
        $requirement = ProcedureRequirement::findOrFail($id);
        $requirement->delete();
        return response()->json(['message' => 'Requirement deleted successfully'], 200);
    }
}
