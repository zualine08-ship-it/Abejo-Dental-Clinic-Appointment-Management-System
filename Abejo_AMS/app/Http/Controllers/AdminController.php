<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    /**
     * Approve appointment cancellation
     */
    public function approveCancellation($appointmentId)
    {
        $admin = Auth::user();
        
        // Verify user is admin
        if ($admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $appointment = Appointment::findOrFail($appointmentId);

        // Check if cancellation is pending
        if ($appointment->cancellation_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Cancellation is not pending',
            ], 400);
        }

        // Update appointment status to cancelled and mark cancellation as approved
        $appointment->update([
            'status' => 'cancelled',
            'cancellation_status' => 'approved',
            'cancelled_by' => 'patient'
        ]);

        // Get appointment details for patient notification
        $patient = User::findOrFail($appointment->patient_id);
        $procedure = $appointment->procedure->name ?? 'Appointment';
        $appointmentDate = $appointment->appointment_date;
        $patientName = $patient->name;

        // Create notification for patient
        Notification::create([
            'user_id' => $patient->id,
            'type' => 'appointment_cancelled',
            'title' => 'Appointment Cancellation Approved',
            'message' => "Your cancellation request for your {$procedure} appointment on {$appointmentDate} has been approved.",
            'data' => [
                'appointment_id' => $appointment->id,
                'patient_id' => $patient->id,
                'patient_name' => $patientName,
                'procedure' => $procedure,
                'appointment_date' => $appointmentDate,
                'cancellation_reason' => $appointment->cancellation_reason,
                'cancellation_status' => 'approved',
            ],
            'read' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cancellation approved successfully',
        ]);
    }

    /**
     * Reject appointment cancellation
     */
    public function rejectCancellation($appointmentId)
    {
        $admin = Auth::user();
        
        // Verify user is admin
        if ($admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $appointment = Appointment::findOrFail($appointmentId);

        // Check if cancellation is pending
        if ($appointment->cancellation_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Cancellation is not pending',
            ], 400);
        }

        // Mark cancellation as rejected
        $appointment->update([
            'cancellation_status' => 'rejected'
        ]);

        // Get appointment details for patient notification
        $patient = User::findOrFail($appointment->patient_id);
        $procedure = $appointment->procedure->name ?? 'Appointment';
        $appointmentDate = $appointment->appointment_date;
        $patientName = $patient->name;

        // Create notification for patient
        Notification::create([
            'user_id' => $patient->id,
            'type' => 'appointment_cancelled',
            'title' => 'Cancellation Request Rejected',
            'message' => "Your cancellation request for your {$procedure} appointment on {$appointmentDate} has been rejected. Please contact support for more information.",
            'data' => [
                'appointment_id' => $appointment->id,
                'patient_id' => $patient->id,
                'patient_name' => $patientName,
                'procedure' => $procedure,
                'appointment_date' => $appointmentDate,
                'cancellation_reason' => $appointment->cancellation_reason,
                'cancellation_status' => 'rejected',
            ],
            'read' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cancellation rejected successfully',
        ]);
    }
}
