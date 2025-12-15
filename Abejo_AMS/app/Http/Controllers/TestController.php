<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Procedure;
use App\Models\Inventory;
use App\Models\PatientHistory;
use App\Models\User;

class TestController extends Controller
{
    public function testApi()
    {
        return response()->json([
            'status' => 'API is working',
            'database' => env('DB_DATABASE'),
            'procedures_count' => Procedure::count(),
            'inventory_count' => Inventory::count(),
            'patient_history_count' => PatientHistory::count(),
            'patients_count' => User::where('role', 'patient')->count(),
            'procedures' => Procedure::with('requirements.inventory')->get(),
            'inventory' => Inventory::all(),
            'patient_histories' => PatientHistory::with('patient', 'procedure')->take(5)->get(),
        ], 200);
    }

    /**
     * Seed test patient history data
     */
    public function seedPatientHistory()
    {
        try {
            // Get some patients
            $patients = User::where('role', 'patient')->limit(5)->get();
            
            if ($patients->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No patients found. Please create patients first.'
                ], 400);
            }

            // Get some procedures
            $procedures = Procedure::limit(5)->get();
            
            if ($procedures->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No procedures found. Please create procedures first.'
                ], 400);
            }

            // Create sample patient history records
            $created = 0;
            foreach ($patients as $patient) {
                foreach ($procedures as $procedure) {
                    // Create 2-3 records per patient-procedure combination
                    $recordCount = rand(1, 3);
                    for ($i = 0; $i < $recordCount; $i++) {
                        PatientHistory::create([
                            'patient_id' => $patient->id,
                            'procedure_id' => $procedure->id,
                            'date_performed' => now()->subDays(rand(1, 90))->format('Y-m-d'),
                            'remarks' => 'Procedure completed successfully'
                        ]);
                        $created++;
                    }
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Created {$created} patient history records",
                'patient_histories' => PatientHistory::with('patient', 'procedure')->get()
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
