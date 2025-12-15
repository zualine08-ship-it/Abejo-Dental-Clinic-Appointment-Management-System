<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Procedure extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'price'];

     public function requirements()
    {
        return $this->hasMany(ProcedureRequirement::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function patientHistories()
    {
        return $this->hasMany(PatientHistory::class);
    }
}
