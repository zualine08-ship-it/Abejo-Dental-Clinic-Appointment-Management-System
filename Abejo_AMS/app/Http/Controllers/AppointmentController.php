<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\ProcedureRequirement;
use App\Models\Inventory;
use App\Models\PatientHistory;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AppointmentController extends Controller
{
    // List all appointments
    public function index(Request $request) {
        $query = Appointment::with('patient', 'procedure');
        
        // If user is authenticated and is a patient (role_id = 2), show only their appointments
        $user = $request->user();
        if ($user && $user->role_id == 2) {
            $query->where('patient_id', $user->id);
        }
        
        // Filter by date if provided
        if ($request->has('date')) {
            $query->whereRaw('DATE(appointment_date) = ?', [$request->date]);
        }
        
        return response()->json($query->get(), 200);
    }

    // Create appointment with inventory check
    public function store(Request $request) {
        // Allow either patient_id (registered patient) or patient_info (walk-in)
        $request->validate([
            'patient_id' => 'nullable|exists:users,id',
            'procedure_id' => 'required|exists:procedures,id',
            'appointment_date' => 'required|date_format:Y-m-d H:i:s',
            'appointment_time' => 'nullable|string',
            'patient_info' => 'nullable|array',
            'patient_info.name' => 'required_if:patient_id,null|string',
            'patient_info.age' => 'required_if:patient_id,null|integer|min:1|max:120',
            'patient_info.contact' => 'required_if:patient_id,null|string',
            'patient_info.email' => 'required_if:patient_id,null|email',
        ]);

        // Check daily booking limit (max 5 approved appointments per day)
        $appointmentDate = date('Y-m-d', strtotime($request->appointment_date));
        $dailyCount = Appointment::whereRaw('DATE(appointment_date) = ?', [$appointmentDate])
            ->where('status', 'approved')
            ->count();

        if ($dailyCount >= 5) {
            return response()->json([
                'message' => "This date is fully booked (maximum 5 confirmed appointments per day). Please select a different date."
            ], 400);
        }

        // Check if the specific time slot is already confirmed (approved or completed)
        // Pending appointments don't block the slot - only admin-confirmed ones do
        $appointmentTime = $request->appointment_time;
        if ($appointmentTime) {
            $existingAppointment = Appointment::whereRaw('DATE(appointment_date) = ?', [$appointmentDate])
                ->where('appointment_time', $appointmentTime)
                ->whereIn('status', ['approved', 'completed'])
                ->first();

            if ($existingAppointment) {
                return response()->json([
                    'message' => "This time slot is already confirmed. Please select a different time."
                ], 400);
            }
        }

        // Check inventory for procedure with eager loading
        $requirements = ProcedureRequirement::where('procedure_id', $request->procedure_id)
            ->with('inventory')
            ->get();

        foreach ($requirements as $req) {
            if ($req->inventory->stock_quantity < $req->quantity_required) {
                return response()->json([
                    'message' => "Cannot book procedure, insufficient stock for {$req->inventory->name}"
                ], 400);
            }
        }

        $patientId = $request->patient_id;
        $patientInfo = $request->patient_info;

        // If this is a walk-in appointment without a patient_id, create a patient record
        if (!$patientId && $patientInfo) {
            try {
                // Check if patient with this email already exists
                $existingPatient = User::where('email', $patientInfo['email'])->first();
                
                if ($existingPatient) {
                    // Use existing patient
                    $patientId = $existingPatient->id;
                } else {
                    // Create new patient record with all available information
                    $newPatient = User::create([
                        'name' => $patientInfo['name'],
                        'email' => $patientInfo['email'],
                        'phone' => $patientInfo['contact'],
                        'age' => $patientInfo['age'] ?? null,
                        'gender' => $patientInfo['gender'] ?? null,
                        'address' => $patientInfo['address'] ?? null,
                        'role' => 'patient',
                        'password' => bcrypt('default_password_' . uniqid()), // Temporary password
                    ]);
                    $patientId = $newPatient->id;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to create patient record for walk-in: ' . $e->getMessage());
                // Continue without patient_id if creation fails
            }
        }

        // Create appointment with the patient_id (either existing or newly created)
        $appointmentData = $request->all();
        if ($patientId) {
            $appointmentData['patient_id'] = $patientId;
        }
        
        $appointment = Appointment::create($appointmentData);
        
        // Notify admin/staff about new appointment
        $admins = User::where('role', 'admin')->orWhere('role', 'staff')->get();
        
        // Get patient name from either patient relationship or patient_info
        $patientName = $appointment->patient?->name ?? $appointment->patient_info['name'] ?? 'Walk-in Patient';
        $procedure = $appointment->procedure;
        
        foreach ($admins as $admin) {
            NotificationService::notifyAppointment(
                $admin,
                $patientName,
                $procedure->name,
                $appointment->appointment_date,
                $appointment->appointment_time
            );
        }
        
        return response()->json($appointment, 201);
    }

    // Update status
    public function update(Request $request, $id) {
        Log::info("Appointment update request", [
            'id' => $id,
            'status' => $request->status,
            'all_data' => $request->all()
        ]);
        
        $appointment = Appointment::findOrFail($id);
        Log::info("Found appointment", ['appointment' => $appointment->toArray()]);
        
        // If updating to "approved" status, check for conflicts
        if ($request->status === 'approved' && $appointment->status !== 'approved') {
            // Check if slot already has 5 appointments on the same date
            $appointmentCount = Appointment::where('appointment_date', $appointment->appointment_date)
                ->where('status', 'approved')
                ->count();

            if ($appointmentCount >= 5) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot confirm appointment. Maximum 5 patients per day reached for this date.',
                    'current_count' => $appointmentCount
                ], 400);
            }

            // Check for overlapping appointments on the same time and date
            $existingAppointment = Appointment::where('appointment_date', $appointment->appointment_date)
                ->where('appointment_time', $appointment->appointment_time)
                ->where('status', 'approved')
                ->where('id', '!=', $id)
                ->first();

            if ($existingAppointment) {
                $conflictPatientName = $existingAppointment->patient?->name ?? $existingAppointment->patient_info['name'] ?? 'Walk-in Patient';
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot confirm appointment. This time slot is already booked. Please reschedule.',
                    'conflict_with' => [
                        'patient' => $conflictPatientName,
                        'date' => $existingAppointment->appointment_date,
                        'time' => $existingAppointment->appointment_time
                    ]
                ], 400);
            }
        }

        // If updating to "completed" status, deduct inventory for procedure requirements
        if ($request->status === 'completed' && $appointment->status !== 'completed') {
            DB::beginTransaction();
            try {
                // Get all requirements for this procedure
                $requirements = ProcedureRequirement::where('procedure_id', $appointment->procedure_id)
                    ->with('inventory')
                    ->get();

                // First, check if all required items have sufficient inventory
                $insufficientItems = [];
                foreach ($requirements as $requirement) {
                    if ($requirement->inventory) {
                        $inventory = Inventory::find($requirement->inventory_id);
                        if ($inventory && $inventory->stock_quantity < $requirement->quantity_required) {
                            $insufficientItems[] = [
                                'name' => $inventory->name,
                                'required' => $requirement->quantity_required,
                                'available' => $inventory->stock_quantity
                            ];
                        }
                    }
                }

                // If any items are insufficient, reject the completion
                if (!empty($insufficientItems)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot complete appointment. Insufficient inventory.',
                        'insufficient_items' => $insufficientItems
                    ], 400);
                }

                // Deduct inventory for each requirement
                foreach ($requirements as $requirement) {
                    if ($requirement->inventory) {
                        $inventory = Inventory::find($requirement->inventory_id);
                        if ($inventory) {
                            $inventory->stock_quantity = max(0, $inventory->stock_quantity - $requirement->quantity_required);
                            $inventory->save();
                        }
                    }
                }

                // Extract just the date part from appointment_date
                $appointmentDate = $appointment->appointment_date;
                if (is_string($appointmentDate) && strpos($appointmentDate, ' ') !== false) {
                    // It's a datetime, extract just the date
                    $datePerformed = explode(' ', $appointmentDate)[0];
                } else {
                    // It's already a date or convert it
                    $datePerformed = is_string($appointmentDate) ? $appointmentDate : date('Y-m-d', strtotime($appointmentDate));
                }

                // Create patient history record ONLY if this is a registered patient (not walk-in)
                // Walk-in appointments have patient_id = null
                if ($appointment->patient_id) {
                    try {
                        $existingRecord = PatientHistory::where('appointment_id', $appointment->id)->first();
                        if (!$existingRecord) {
                            // Create patient history record
                            PatientHistory::create([
                                'patient_id' => $appointment->patient_id,
                                'procedure_id' => $appointment->procedure_id,
                                'appointment_id' => $appointment->id,
                                'date_performed' => $datePerformed,
                                'remarks' => 'Appointment completed'
                            ]);
                        }
                    } catch (\Exception $e) {
                        // Log the error but don't fail - patient history is secondary
                        Log::warning('Failed to create patient history: ' . $e->getMessage(), [
                            'appointment_id' => $appointment->id,
                            'patient_id' => $appointment->patient_id
                        ]);
                    }
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error completing appointment: ' . $e->getMessage(), [
                    'appointment_id' => $id,
                    'exception' => $e
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to complete appointment: ' . $e->getMessage()
                ], 500);
            }
        }

        $oldStatus = $appointment->status;
        
        // Build update data
        $updateData = ['status' => $request->status];
        
        // If rescheduling, save the reason and details
        if ($request->status === 'rescheduled') {
            $updateData['reschedule_reason'] = $request->reschedule_reason ?? null;
            $updateData['reschedule_reason_details'] = $request->reschedule_reason_details ?? null;
        }
        
        // If cancelling, save the cancellation reason and details
        if ($request->status === 'cancelled') {
            $updateData['cancellation_reason'] = $request->cancellation_reason ?? null;
            $updateData['cancellation_reason_details'] = $request->cancellation_reason_details ?? null;
            $updateData['cancelled_by'] = $request->cancelled_by ?? null;
        }
        
        $appointment->update($updateData);
        
        // Get patient name for notifications
        $patientName = $appointment->patient?->name ?? $appointment->patient_info['name'] ?? 'Walk-in Patient';
        
        // Create notification based on status change (skip for walk-in appointments)
        if ($appointment->patient_id) {
            if ($request->status === 'approved' && $oldStatus !== 'approved') {
                // Notify patient about appointment approval
                NotificationService::notifyAppointmentApproved(
                    $appointment->patient,
                    $appointment->id,
                    $appointment->appointment_date,
                    $appointment->appointment_time
                );
            } elseif ($request->status === 'cancelled' && $oldStatus !== 'cancelled') {
                // Notify patient about appointment cancellation
                if ($appointment->patient_id) {
                    $reason = $request->cancellation_reason ?? 'Unknown reason';
                    $details = $request->cancellation_reason_details ?? '';
                    
                    NotificationService::notifyAppointmentCancellation(
                        $appointment->patient,
                        $appointment->procedure->name,
                        $appointment->appointment_date,
                        $reason,
                        $details
                    );
                }
            } elseif ($request->status === 'rejected' && $oldStatus !== 'rejected') {
                // Notify patient about appointment rejection
                NotificationService::notifyAppointmentRejected(
                    $appointment->patient,
                    $appointment->procedure->name,
                    $appointment->appointment_date
                );
            } elseif ($request->status === 'rescheduled' && $oldStatus !== 'rescheduled') {
                // Notify patient about appointment rescheduling with reason
                $reason = $request->reschedule_reason ?? 'Unknown reason';
                $details = $request->reschedule_reason_details ?? '';
                
                NotificationService::notifyAppointmentRescheduled(
                    $appointment->patient,
                    $appointment->procedure->name,
                    $oldStatus === 'approved' ? $appointment->appointment_date : 'pending date',
                    $appointment->appointment_date,
                    $appointment->appointment_time,
                    $reason,
                    $details
                );
            } elseif ($request->status === 'completed' && $oldStatus !== 'completed') {
                // Notify patient about appointment completion with rate request
                NotificationService::notifyAppointmentCompleted(
                    $appointment->patient,
                    $appointment->procedure->name,
                    $appointment->appointment_date,
                    $appointment->id
                );
            }
        }
        
        Log::info("Appointment updated successfully", [
            'id' => $id,
            'new_status' => $request->status,
            'updated_appointment' => $appointment->toArray()
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Appointment updated successfully',
            'appointment' => $appointment->load('patient', 'procedure')
        ], 200);
    }

    // Delete appointment
    public function destroy($id) {
        $appointment = Appointment::findOrFail($id);
        $appointment->delete();
        return response()->json(['message'=>'Deleted successfully'], 200);
    }

    // Get public reviews (for patient dashboard - anonymized names)
    public function getPublicReviews() {
        try {
            $reviews = Appointment::where('rating', '!=', null)
                ->with('procedure')
                ->orderBy('rating_date', 'desc')
                ->limit(10) // Limit to recent 10 reviews
                ->get()
                ->map(function($appointment) {
                    // Anonymize patient name (show only first name + last initial)
                    $fullName = $appointment->patient?->name ?? $appointment->patient_info['name'] ?? 'Anonymous';
                    $nameParts = explode(' ', $fullName);
                    $anonymizedName = $nameParts[0];
                    if (count($nameParts) > 1) {
                        $anonymizedName .= ' ' . substr(end($nameParts), 0, 1) . '.';
                    }
                    
                    return [
                        'id' => $appointment->id,
                        'patient_name' => $anonymizedName,
                        'procedure' => $appointment->procedure->name ?? 'Dental Service',
                        'rating' => $appointment->rating,
                        'comment' => $appointment->comment ?? '',
                        'date' => $appointment->rating_date 
                            ? \Carbon\Carbon::parse($appointment->rating_date)->format('M d, Y')
                            : 'N/A',
                    ];
                });

            // Calculate average rating
            $avgRating = Appointment::where('rating', '!=', null)->avg('rating');

            return response()->json([
                'success' => true,
                'reviews' => $reviews,
                'total' => Appointment::where('rating', '!=', null)->count(),
                'average_rating' => round($avgRating, 1) ?? 0
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error fetching public reviews: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reviews'
            ], 500);
        }
    }

    // Get all reviews with ratings
    public function getAllReviews() {
        try {
            $reviews = Appointment::where('rating', '!=', null)
                ->with('patient', 'procedure')
                ->orderBy('rating_date', 'desc')
                ->get()
                ->map(function($appointment) {
                    return [
                        'id' => $appointment->id,
                        'appointment_id' => $appointment->id,
                        'patient_name' => $appointment->patient?->name ?? $appointment->patient_info['name'] ?? 'Walk-in Patient',
                        'procedure' => $appointment->procedure->name ?? 'N/A',
                        'rating' => $appointment->rating,
                        'comment' => $appointment->comment ?? '',
                        'date' => $appointment->rating_date 
                            ? \Carbon\Carbon::parse($appointment->rating_date)->format('M d, Y')
                            : 'N/A',
                    ];
                });

            return response()->json([
                'success' => true,
                'reviews' => $reviews,
                'total' => $reviews->count()
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error fetching reviews: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reviews'
            ], 500);
        }
    }

    // Rate an appointment
    public function rateAppointment(Request $request, $id) {
        try {
            $request->validate([
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string|max:500',
            ]);

            $appointment = Appointment::findOrFail($id);
            
            $appointment->update([
                'rating' => $request->rating,
                'comment' => $request->comment ?? null,
                'rating_date' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Rating submitted successfully',
                'appointment' => $appointment
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error rating appointment: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit rating'
            ], 500);
        }
    }

    // Delete/Clear a review from an appointment
    public function deleteReview($id) {
        try {
            $appointment = Appointment::findOrFail($id);
            
            $appointment->update([
                'rating' => null,
                'comment' => null,
                'rating_date' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Review deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error deleting review: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete review'
            ], 500);
        }
    }

    /**
     * Get monthly booking counts for calendar view
     * Returns count of bookings per day for a given month
     */
    public function getMonthlyBookings(Request $request)
    {
        try {
            $month = $request->query('month', date('m'));
            $year = $request->query('year', date('Y'));
            
            $startDate = "$year-$month-01";
            $endDate = date('Y-m-t', strtotime($startDate));
            
            // Get booking counts grouped by date (only approved/confirmed appointments count towards limit)
            $bookings = Appointment::selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
                ->whereRaw('DATE(appointment_date) BETWEEN ? AND ?', [$startDate, $endDate])
                ->where('status', 'approved')
                ->groupBy('date')
                ->get()
                ->keyBy('date')
                ->map(fn($item) => $item->count);

            // Build response with all dates in the month
            $result = [];
            $currentDate = new \DateTime($startDate);
            $endDateTime = new \DateTime($endDate);
            
            while ($currentDate <= $endDateTime) {
                $dateStr = $currentDate->format('Y-m-d');
                $count = $bookings[$dateStr] ?? 0;
                $result[$dateStr] = [
                    'count' => $count,
                    'available' => 5 - $count,
                    'status' => $count >= 5 ? 'full' : ($count >= 3 ? 'almost-full' : 'available')
                ];
                $currentDate->modify('+1 day');
            }

            return response()->json([
                'success' => true,
                'data' => $result,
                'max_per_day' => 5
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error fetching monthly bookings: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch calendar data'
            ], 500);
        }
    }

    /**
     * Get appointments for a specific date
     */
    public function getBookingsByDate($date)
    {
        try {
            $appointments = Appointment::with(['patient', 'procedure'])
                ->whereRaw('DATE(appointment_date) = ?', [$date])
                ->whereIn('status', ['pending', 'approved'])
                ->orderBy('appointment_time', 'asc')
                ->get()
                ->map(function ($apt) {
                    return [
                        'id' => $apt->id,
                        'patient_name' => $apt->patient?->name ?? $apt->patient_info['name'] ?? 'Walk-in Patient',
                        'procedure' => $apt->procedure->name ?? 'N/A',
                        'time' => $apt->appointment_time ?? date('H:i', strtotime($apt->appointment_date)),
                        'status' => $apt->status,
                    ];
                });

            $totalCount = Appointment::whereRaw('DATE(appointment_date) = ?', [$date])
                ->whereIn('status', ['pending', 'approved'])
                ->count();

            return response()->json([
                'success' => true,
                'date' => $date,
                'appointments' => $appointments,
                'total' => $totalCount,
                'available' => max(0, 5 - $totalCount),
                'is_full' => $totalCount >= 5
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error fetching bookings by date: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments'
            ], 500);
        }
    }

    /**
     * Get calendar data for a month (booking counts per day)
     * Used by the admin Calendar component
     */
    public function getCalendarData(Request $request)
    {
        try {
            $year = $request->query('year', date('Y'));
            $month = $request->query('month', date('m'));
            
            $startDate = "$year-$month-01";
            $endDate = date('Y-m-t', strtotime($startDate));
            
            // Get booking counts grouped by date (pending and approved appointments)
            $bookings = Appointment::selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
                ->whereRaw('DATE(appointment_date) BETWEEN ? AND ?', [$startDate, $endDate])
                ->whereIn('status', ['pending', 'approved'])
                ->groupBy('date')
                ->get()
                ->map(fn($item) => [
                    'date' => $item->date,
                    'count' => $item->count
                ]);

            return response()->json($bookings, 200);
        } catch (\Exception $e) {
            Log::error("Error fetching calendar data: " . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Get appointments for a specific date
     * Used by the admin Calendar component for day click modal
     */
    public function getAppointmentsByDate(Request $request)
    {
        try {
            $date = $request->query('date');
            
            if (!$date) {
                return response()->json([], 200);
            }
            
            $appointments = Appointment::with(['patient', 'procedure'])
                ->whereRaw('DATE(appointment_date) = ?', [$date])
                ->whereIn('status', ['pending', 'approved', 'completed'])
                ->orderBy('appointment_time', 'asc')
                ->get()
                ->map(function ($apt) {
                    return [
                        'id' => $apt->id,
                        'patient_name' => $apt->patient?->name ?? $apt->patient_info['name'] ?? 'Walk-in Patient',
                        'patient_email' => $apt->patient?->email ?? $apt->patient_info['email'] ?? null,
                        'patient_contact' => $apt->patient?->contact ?? $apt->patient_info['contact'] ?? null,
                        'procedure_name' => $apt->procedure->name ?? 'N/A',
                        'appointment_date' => $apt->appointment_date,
                        'appointment_time' => $apt->appointment_time ?? date('H:i', strtotime($apt->appointment_date)),
                        'status' => $apt->status,
                    ];
                });

            return response()->json($appointments, 200);
        } catch (\Exception $e) {
            Log::error("Error fetching appointments by date: " . $e->getMessage());
            return response()->json([], 200);
        }
    }
}
