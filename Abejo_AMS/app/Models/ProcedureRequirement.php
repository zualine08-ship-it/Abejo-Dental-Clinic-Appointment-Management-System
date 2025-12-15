<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProcedureRequirement extends Model
{
    use HasFactory;

    protected $fillable = ['procedure_id', 'inventory_id', 'quantity_required'];

       public function procedure()
    {
        return $this->belongsTo(Procedure::class);
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }
}

