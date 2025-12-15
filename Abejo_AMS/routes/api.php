<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProcedureController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProcedureRequirementController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\PatientHistoryController;
use App\Http\Controllers\TestController;
use App\Http\Controllers\NotificationController;

// ---------------------------
// TEST ENDPOINT
// ---------------------------
Route::get('/test', [TestController::class, 'testApi']);
Route::post('/test/seed-patient-history', [TestController::class, 'seedPatientHistory']);

// ---------------------------
// AUTHENTICATION (No CSRF needed for API)
// ---------------------------
Route::middleware([\Illuminate\Session\Middleware\StartSession::class])->group(function () {
	Route::post('/login', [AuthController::class, 'login'])->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class]);
	Route::post('/register', [AuthController::class, 'register'])->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class]);
	Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
	Route::get('/me', [AuthController::class, 'me'])->middleware('auth');
});

// ---------------------------
// PROCEDURES (Public - read only)
// ---------------------------
Route::get('/procedures', [ProcedureController::class, 'index']);
Route::get('/procedures-availability', [ProcedureController::class, 'checkAvailability']);
Route::get('/procedures/{id}', [ProcedureController::class, 'show']);

// ---------------------------
// PUBLIC REVIEWS (Anyone can view patient reviews)
// ---------------------------
Route::get('/public/reviews', [AppointmentController::class, 'getPublicReviews']);

// ---------------------------
// PROCEDURES (Write operations)
// ---------------------------
Route::post('/procedures', [ProcedureController::class, 'store']);
Route::put('/procedures/{id}', [ProcedureController::class, 'update']);
Route::delete('/procedures/{id}', [ProcedureController::class, 'destroy']);

// ---------------------------
// INVENTORY
// ---------------------------
Route::get('/inventory', [InventoryController::class, 'index']);
Route::post('/inventory', [InventoryController::class, 'store']);
Route::put('/inventory/{id}', [InventoryController::class, 'update']);
Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);
Route::get('/inventory/{id}/activities', [InventoryController::class, 'getActivities']);

// ---------------------------
// PROCEDURE REQUIREMENTS
// ---------------------------
Route::get('/procedure-requirements', [ProcedureRequirementController::class, 'index']);
Route::post('/procedure-requirements', [ProcedureRequirementController::class, 'store']);
Route::get('/procedure-requirements/{id}', [ProcedureRequirementController::class, 'show']);
Route::put('/procedure-requirements/{id}', [ProcedureRequirementController::class, 'update']);
Route::delete('/procedure-requirements/{id}', [ProcedureRequirementController::class, 'destroy']);

// ---------------------------
// APPOINTMENTS
// ---------------------------
Route::middleware([\Illuminate\Session\Middleware\StartSession::class, 'auth'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index']);
});
Route::post('/appointments', [AppointmentController::class, 'store']);
Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
Route::get('/appointments/reviews', [AppointmentController::class, 'getAllReviews']);
Route::post('/appointments/{id}/rate', [AppointmentController::class, 'rateAppointment']);
Route::delete('/appointments/{id}/review', [AppointmentController::class, 'deleteReview']);

// Calendar endpoints
Route::get('/appointments/calendar/monthly', [AppointmentController::class, 'getMonthlyBookings']);
Route::get('/appointments/calendar/date/{date}', [AppointmentController::class, 'getBookingsByDate']);
Route::get('/appointments/calendar', [AppointmentController::class, 'getCalendarData']);
Route::get('/appointments/by-date', [AppointmentController::class, 'getAppointmentsByDate']);

// ---------------------------
// PATIENT HISTORY
// ---------------------------
Route::get('/patient-history', [PatientHistoryController::class, 'index']);
Route::post('/patient-history', [PatientHistoryController::class, 'store']);
Route::get('/patient-history/{id}', [PatientHistoryController::class, 'show']);
Route::delete('/patient-history/{id}', [PatientHistoryController::class, 'destroy']);

// ---------------------------
// PATIENTS (for dashboard/reports)
// ---------------------------
Route::get('/patients', [App\Http\Controllers\PatientController::class, 'index']);
Route::get('/patients/count', [App\Http\Controllers\PatientController::class, 'count']);

// ---------------------------
// PATIENT DASHBOARD (Protected routes)
// ---------------------------
Route::middleware([\Illuminate\Session\Middleware\StartSession::class, 'auth'])->group(function () {
	Route::get('/patient/profile', [App\Http\Controllers\PatientController::class, 'profile']);
	Route::put('/patient/profile', [App\Http\Controllers\PatientController::class, 'updateProfile']);
	Route::get('/patient/appointments', [App\Http\Controllers\PatientController::class, 'appointments']);
	Route::get('/patient/medical-history', [App\Http\Controllers\PatientController::class, 'medicalHistory']);
	Route::get('/patient/health-summary', [App\Http\Controllers\PatientController::class, 'healthSummary']);
	Route::get('/patient/appointments/{id}', [App\Http\Controllers\PatientController::class, 'appointmentDetails']);
	Route::patch('/patient/appointments/{id}/cancel', [App\Http\Controllers\PatientController::class, 'cancelAppointment']);
});

// ---------------------------
// NOTIFICATIONS (Protected routes)
// ---------------------------
Route::middleware([\Illuminate\Session\Middleware\StartSession::class, 'auth'])->group(function () {
	Route::get('/notifications', [NotificationController::class, 'index']);
	Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
	Route::put('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
	Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
	Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
	
	// Patient-specific notification routes
	Route::get('/patient/notifications', [NotificationController::class, 'patientNotifications']);
	Route::get('/patient/notifications/unread-count', [NotificationController::class, 'patientUnreadCount']);
});
