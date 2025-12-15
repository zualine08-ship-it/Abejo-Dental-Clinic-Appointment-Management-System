<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PatientHistory;
use App\Models\Appointment;
use App\Models\Procedure;
use App\Models\Inventory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PatientHistoryController extends Controller
{
    /**
     * List all patient histories
     */
    public function index() {
        return response()->json(
            PatientHistory::with([
                'patient:id,name,phone,gender,age,address',
                'procedure:id,name',
                'appointment:id,appointment_date,appointment_time,status'
            ])
                ->orderBy('date_performed', 'desc')
                ->get(),
            200
        );
    }

    /**
     * Create patient history from completed appointment
     */
    public function store(Request $request) {
        $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
        ]);

        try {
            $appointment = Appointment::with('patient', 'procedure')->findOrFail($request->appointment_id);

            // Check if record already exists for this appointment
            $existingRecord = PatientHistory::where('appointment_id', $appointment->id)->first();
            if ($existingRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient record already exists for this appointment'
                ], 400);
            }

            // Extract just the date part from appointment_date (handle both date and datetime formats)
            $appointmentDate = $appointment->appointment_date;
            if (strpos($appointmentDate, ' ') !== false) {
                // It's a datetime, extract just the date
                $datePerformed = explode(' ', $appointmentDate)[0];
            } else {
                // It's already a date
                $datePerformed = $appointmentDate;
            }

            // Use transaction to ensure data consistency
            DB::beginTransaction();

            try {
                // Create patient history record
                $patientHistory = PatientHistory::create([
                    'patient_id' => $appointment->patient_id,
                    'procedure_id' => $appointment->procedure_id,
                    'appointment_id' => $appointment->id,
                    'date_performed' => $datePerformed,
                    'remarks' => 'Appointment completed'
                ]);

                // Deduct inventory for the procedure
                $procedure = Procedure::with('requirements.inventory')->findOrFail($appointment->procedure_id);
                
                foreach ($procedure->requirements as $requirement) {
                    $inventoryItem = Inventory::findOrFail($requirement->inventory_id);
                    
                    // Check if sufficient stock exists
                    if ($inventoryItem->stock_quantity < $requirement->quantity_required) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient stock for {$inventoryItem->name}. Required: {$requirement->quantity_required}, Available: {$inventoryItem->stock_quantity}"
                        ], 400);
                    }
                    
                    // Deduct the stock
                    $inventoryItem->stock_quantity -= $requirement->quantity_required;
                    $inventoryItem->save();
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Patient record created successfully and inventory deducted',
                    'patient_history' => $patientHistory->load('patient', 'procedure')
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create patient record: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get single patient history
     */
    public function show($id) {
        $patientHistory = PatientHistory::with('patient', 'procedure', 'appointment')->findOrFail($id);
        return response()->json($patientHistory, 200);
    }

    /**
     * Delete patient history
     */
    public function destroy($id) {
        $patientHistory = PatientHistory::findOrFail($id);
        $patientHistory->delete();
        return response()->json([
            'success' => true,
            'message' => 'Patient record deleted successfully'
        ], 200);
    }
}
