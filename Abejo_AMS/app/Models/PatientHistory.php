<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'procedure_id',
        'appointment_id',
        'date_performed',
        'remarks'
    ];

    public function procedure()
    {
        return $this->belongsTo(Procedure::class);
    }

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
