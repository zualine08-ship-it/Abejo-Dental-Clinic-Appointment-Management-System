<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Appointment;
use App\Models\PatientHistory;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PatientController extends Controller
{
    /**
     * Get all patients (for dashboard/reports)
     */
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 100);
        $page = $request->query('page', 1);
        $search = $request->query('search', '');
        
        $query = User::where('role', 'patient')
            ->select('id', 'name', 'email', 'phone', 'gender', 'date_of_birth', 'age', 'created_at');
        
        // Apply search filter
        if ($search) {
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%');
        }
        
        $patients = $query->paginate($perPage, ['*'], 'page', $page);
        return response()->json($patients, 200);
    }

    /**
     * Get total patient count (for dashboard) - counts unique patients with valid appointments
     */
    public function count()
    {
        // Count distinct patients who have appointments that are NOT cancelled or rescheduled
        $totalPatients = Appointment::whereNotIn('status', ['cancelled', 'rescheduled'])
            ->distinct()
            ->count('patient_id');
        
        return response()->json(['total' => $totalPatients], 200);
    }

    /**
     * Get patient profile
     */
    public function profile(Request $request)
    {
        $patient = Auth::user();
        
        return response()->json([
            'success' => true,
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
                'email' => $patient->email,
                'phone' => $patient->phone ?? 'N/A',
                'date_of_birth' => $patient->date_of_birth ?? null,
                'address' => $patient->address ?? 'N/A',
                'barangay' => $patient->barangay ?? 'N/A',
                'city_municipality' => $patient->city_municipality ?? 'N/A',
                'emergency_contact' => $patient->emergency_contact ?? 'N/A',
                'gender' => $patient->gender ?? 'N/A',
                'age' => $patient->age ?? null,
                'created_at' => $patient->created_at,
            ]
        ]);
    }

    /**
     * Update patient profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
                'date_of_birth' => 'nullable|date',
                'address' => 'nullable|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'city_municipality' => 'nullable|string|max:255',
                'emergency_contact' => 'nullable|string|max:255',
                'gender' => 'nullable|string|in:Male,Female,Other',
                'age' => 'nullable|integer|min:0|max:150',
            ]);

            /** @var User $patient */
            $patient = Auth::user();
            
            $patient->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'patient' => [
                    'id' => $patient->id,
                    'name' => $patient->name,
                    'email' => $patient->email,
                    'phone' => $patient->phone ?? 'N/A',
                    'date_of_birth' => $patient->date_of_birth ?? null,
                    'address' => $patient->address ?? 'N/A',
                    'barangay' => $patient->barangay ?? 'N/A',
                    'city_municipality' => $patient->city_municipality ?? 'N/A',
                    'emergency_contact' => $patient->emergency_contact ?? 'N/A',
                    'gender' => $patient->gender ?? 'N/A',
                    'age' => $patient->age ?? null,
                ]
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Profile update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get patient's upcoming appointments
     */
    public function appointments(Request $request)
    {
        $patient = Auth::user();
        
        $appointments = Appointment::where('patient_id', $patient->id)
            ->with('procedure')
            ->orderBy('appointment_date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'appointments' => $appointments->map(function ($appt) {
                return [
                    'id' => $appt->id,
                    'procedure' => $appt->procedure->name ?? 'General Checkup',
                    'price' => $appt->procedure->price ?? 0,
                    'date' => $appt->appointment_date,
                    'time' => $appt->appointment_time,
                    'status' => $appt->status ?? 'pending',
                    'rating' => $appt->rating,
                    'comment' => $appt->comment,
                    'rating_date' => $appt->rating_date ? date('M d, Y', strtotime($appt->rating_date)) : null,
                ];
            })
        ]);
    }

    /**
     * Get patient's medical history
     */
    public function medicalHistory(Request $request)
    {
        $patient = Auth::user();
        
        $history = PatientHistory::where('patient_id', $patient->id)
            ->orderBy('date_performed', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'history' => $history->map(function ($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->date_performed,
                    'diagnosis' => $record->diagnosis ?? 'Not recorded',
                    'treatment' => $record->treatment ?? 'Not recorded',
                    'doctor' => $record->doctor_name ?? 'Dr. Available',
                    'notes' => $record->notes ?? '',
                ];
            })
        ]);
    }

    /**
     * Get patient's health summary
     */
    public function healthSummary(Request $request)
    {
        $patient = Auth::user();
        
        $totalAppointments = Appointment::where('patient_id', $patient->id)->count();
        // Only count pending appointments as upcoming (not completed, not cancelled)
        $upcomingAppointments = Appointment::where('patient_id', $patient->id)
            ->where('status', 'pending')
            ->count();
        $medicalRecords = PatientHistory::where('patient_id', $patient->id)->count();
        $completedAppointments = Appointment::where('patient_id', $patient->id)
            ->where('status', 'completed')
            ->count();

        return response()->json([
            'success' => true,
            'summary' => [
                'total_appointments' => $totalAppointments,
                'upcoming_appointments' => $upcomingAppointments,
                'completed_appointments' => $completedAppointments,
                'medical_records' => $medicalRecords,
                'last_visit' => PatientHistory::where('patient_id', $patient->id)
                    ->orderBy('date_performed', 'desc')
                    ->first()?->date_performed ?? 'No records',
            ]
        ]);
    }

    /**
     * Get appointment details
     */
    public function appointmentDetails($appointmentId)
    {
        $patient = Auth::user();
        
        $appointment = Appointment::where('id', $appointmentId)
            ->where('patient_id', $patient->id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'appointment' => [
                'id' => $appointment->id,
                'doctor' => $appointment->doctor_name ?? 'Dr. Available',
                'procedure' => $appointment->procedure_type ?? 'General Checkup',
                'date' => $appointment->appointment_date,
                'time' => $appointment->appointment_time,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
                'location' => $appointment->location ?? 'Main Clinic',
                'duration' => $appointment->duration ?? '30 mins',
            ]
        ]);
    }

    /**
     * Cancel appointment
     */
    public function cancelAppointment($appointmentId)
    {
        $patient = Auth::user();
        
        $appointment = Appointment::where('id', $appointmentId)
            ->where('patient_id', $patient->id)
            ->firstOrFail();

        $cancellationReason = request()->input('cancellation_reason', '');

        $appointment->update([
            'status' => 'cancelled',
            'cancellation_reason' => $cancellationReason,
            'cancelled_by' => 'patient'
        ]);

        // Get appointment details for notification
        $procedure = $appointment->procedure->name ?? 'Appointment';
        $appointmentDate = $appointment->appointment_date;
        $patientName = $patient->name;

        // Create notification for all admin users
        $adminUsers = User::where('role', 'admin')->get();
        
        foreach ($adminUsers as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'appointment_cancelled',
                'title' => 'Appointment Cancelled',
                'message' => "{$patientName} cancelled their {$procedure} appointment scheduled for {$appointmentDate}",
                'data' => [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $patient->id,
                    'patient_name' => $patientName,
                    'procedure' => $procedure,
                    'appointment_date' => $appointmentDate,
                    'cancellation_reason' => $cancellationReason,
                ],
                'read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Appointment cancelled successfully',
        ]);
    }
}
