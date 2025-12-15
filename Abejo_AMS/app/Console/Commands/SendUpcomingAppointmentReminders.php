<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\Notification;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendUpcomingAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:send-reminders {--days=1 : Number of days ahead to send reminders}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send reminder notifications to patients for their upcoming appointments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $daysAhead = $this->option('days');
        
        // Calculate the date range
        $startDate = Carbon::now()->startOfDay();
        $endDate = Carbon::now()->addDays($daysAhead)->endOfDay();
        
        // Get approved appointments within the date range that haven't been reminded
        $upcomingAppointments = Appointment::whereBetween('appointment_date', [$startDate, $endDate])
            ->where('status', 'approved')
            ->with('patient', 'procedure')
            ->get();

        $reminderCount = 0;

        foreach ($upcomingAppointments as $appointment) {
            // Check if reminder was already sent
            $existingReminder = Notification::where('user_id', $appointment->patient_id)
                ->where('type', 'appointment')
                ->where('data->appointment_type', 'reminder')
                ->where('data->appointment_id', $appointment->id)
                ->exists();

            if (!$existingReminder) {
                // Send reminder notification
                NotificationService::notifyUpcomingAppointment(
                    $appointment->patient,
                    $appointment->procedure->name,
                    $appointment->appointment_date,
                    $appointment->appointment_time
                );

                $reminderCount++;
                $this->line("Reminder sent to {$appointment->patient->name} for {$appointment->procedure->name} on {$appointment->appointment_date}");
            }
        }

        $this->info("Successfully sent $reminderCount appointment reminders!");
    }
}
