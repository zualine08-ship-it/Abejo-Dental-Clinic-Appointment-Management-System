<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Create a notification for a user.
     */
    public static function create(
        User|int $user,
        string $type,
        string $title,
        string $message,
        array $data = []
    ): Notification {
        $userId = $user instanceof User ? $user->id : $user;

        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);
    }

    /**
     * Create appointment notification.
     */
    public static function notifyAppointment(User|int $user, string $patientName, string $procedure, string $date, string $time): Notification
    {
        return self::create(
            $user,
            'appointment',
            'New Appointment',
            "$patientName booked an appointment for $procedure on $date at $time",
            [
                'appointment_type' => 'new',
                'patient_name' => $patientName,
                'procedure_name' => $procedure,
                'date' => $date,
                'time' => $time,
            ]
        );
    }

    /**
     * Create appointment cancellation notification.
     */
    public static function notifyAppointmentCancellation(User|int $user, string $procedure, string $date, string $reason = '', string $details = ''): Notification
    {
        $message = "Your appointment for $procedure on $date has been cancelled.";
        if ($reason) {
            // If reason is "Other (Admin to specify)" and details are provided, show the details
            if ($reason === 'Other (Admin to specify)' && !empty($details)) {
                $message .= " Reason: $details";
            } else {
                $message .= " Reason: $reason";
            }
        }
        
        return self::create(
            $user,
            'cancellation',
            'Appointment Cancelled',
            $message,
            [
                'appointment_type' => 'cancelled',
                'procedure_name' => $procedure,
                'date' => $date,
                'reason' => $reason,
                'details' => $details,
            ]
        );
    }

    /**
     * Create patient appointment rejection notification.
     */
    public static function notifyAppointmentRejected(User|int $user, string $procedure, string $date): Notification
    {
        return self::create(
            $user,
            'cancellation',
            'Appointment Not Approved',
            "Your appointment request for $procedure on $date was not approved. Please try booking another date.",
            [
                'appointment_type' => 'rejected',
                'procedure_name' => $procedure,
                'date' => $date,
            ]
        );
    }

    /**
     * Create upcoming appointment reminder for patient.
     */
    public static function notifyUpcomingAppointment(User|int $user, string $procedure, string $date, string $time): Notification
    {
        return self::create(
            $user,
            'appointment',
            'Upcoming Appointment',
            "Reminder: Your appointment for $procedure is scheduled for $date at $time",
            [
                'appointment_type' => 'reminder',
                'procedure_name' => $procedure,
                'date' => $date,
                'time' => $time,
            ]
        );
    }

    /**
     * Create appointment rescheduled notification.
     */
    public static function notifyAppointmentRescheduled(User|int $user, string $procedure, string $oldDate, string $newDate, string $newTime, string $reason = '', string $details = ''): Notification
    {
        $message = "Your appointment for $procedure has been rescheduled. Please choose another date to book your appointment";
        if ($reason) {
            // If reason is "Other (Admin to specify)" and details are provided, show the details
            if ($reason === 'Other (Admin to specify)' && !empty($details)) {
                $message .= " (Reason: $details)";
            } else {
                $message .= " (Reason: $reason)";
            }
        }
        
        return self::create(
            $user,
            'appointment',
            'Appointment Rescheduled',
            $message,
            [
                'appointment_type' => 'rescheduled',
                'procedure_name' => $procedure,
                'old_date' => $oldDate,
                'new_date' => $newDate,
                'new_time' => $newTime,
                'reason' => $reason,
                'details' => $details,
            ]
        );
    }



    /**
     * Create appointment approved notification.
     */
    public static function notifyAppointmentApproved(User|int $user, string $appointmentId, string $date, string $time): Notification
    {
        return self::create(
            $user,
            'appointment',
            'Appointment Approved',
            "Your appointment has been approved for $date at $time. Please arrive 20 minutes before your procedure.",
            [
                'appointment_id' => $appointmentId,
                'date' => $date,
                'time' => $time,
                'status' => 'approved',
            ]
        );
    }

    /**
     * Create appointment reminder 1 day before.
     */
    public static function notifyAppointmentReminder1DayBefore(User|int $user, string $procedure, string $date, string $time): Notification
    {
        return self::create(
            $user,
            'reminder',
            'Appointment Reminder - Tomorrow',
            "Reminder: Your $procedure appointment is scheduled for tomorrow, $date at $time. Please arrive 20 minutes early.",
            [
                'appointment_type' => 'reminder_1_day_before',
                'procedure_name' => $procedure,
                'date' => $date,
                'time' => $time,
            ]
        );
    }

    /**
     * Create appointment reminder on the day of appointment.
     */
    public static function notifyAppointmentReminderDayOf(User|int $user, string $procedure, string $date, string $time): Notification
    {
        return self::create(
            $user,
            'reminder',
            'Appointment Reminder - Today',
            "Reminder: Your $procedure appointment is today at $time. Please arrive 20 minutes early.",
            [
                'appointment_type' => 'reminder_day_of',
                'procedure_name' => $procedure,
                'date' => $date,
                'time' => $time,
            ]
        );
    }

    /**
     * Create appointment completed notification.
     */
    public static function notifyAppointmentCompleted(User|int $user, string $procedure, string $date, ?int $appointmentId = null): Notification
    {
        return self::create(
            $user,
            'completed',
            'Procedure Completed - Rate Us!',
            "Your $procedure procedure has been completed. We'd love to hear your feedback! Click here to rate your experience.",
            [
                'appointment_type' => 'completed',
                'procedure_name' => $procedure,
                'date' => $date,
                'status' => 'completed',
                'appointment_id' => $appointmentId,
                'action' => 'rate',
            ]
        );
    }

    /**
     * Create out of stock inventory notification.
     */
    public static function notifyOutOfStock(User|int $user, string $itemName): Notification
    {
        return self::create(
            $user,
            'inventory',
            'Item Out of Stock',
            "$itemName is now out of stock! Please reorder this item as soon as possible.",
            [
                'inventory_alert' => 'out_of_stock',
                'item_name' => $itemName,
                'status' => 'out_of_stock',
                'action' => 'reorder',
            ]
        );
    }

    /**
     * Create low inventory notification.
     */
    public static function notifyLowInventory(User|int $user, string $itemName, int $currentStock, int $minQuantity): Notification
    {
        return self::create(
            $user,
            'inventory',
            'Low Stock Alert',
            "$itemName is running low on stock! Current quantity: $currentStock (Minimum required: $minQuantity). Consider reordering.",
            [
                'inventory_alert' => 'low_stock',
                'item_name' => $itemName,
                'current_stock' => $currentStock,
                'min_quantity' => $minQuantity,
                'status' => 'low_stock',
                'action' => 'reorder',
            ]
        );
    }
}
