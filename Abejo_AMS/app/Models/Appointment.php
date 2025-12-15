<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'procedure_id',
        'appointment_date',
        'appointment_time',
        'status',
        'patient_info',
        'reschedule_reason',
        'reschedule_reason_details',
        'cancellation_reason',
        'cancellation_reason_details',
        'cancelled_by',
        'rating',
        'comment',
        'rating_date'
    ];

    protected $casts = [
        'patient_info' => 'json',
    ];

    public function procedure()
    {
        return $this->belongsTo(Procedure::class);
    }

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
}

