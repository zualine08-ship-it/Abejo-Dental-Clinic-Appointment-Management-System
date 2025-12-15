<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'stock_quantity', 'unit', 'min_quantity', 'last_restock_date'];

    protected $casts = [
        'last_restock_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function requirements()
    {
        return $this->hasMany(ProcedureRequirement::class);
    }

    public function procedures()
    {
        return $this->belongsToMany(
            Procedure::class, 
            'procedure_requirements', 
            'inventory_id', 
            'procedure_id'
        );
    }

    public function activities()
    {
        return $this->hasMany(InventoryActivity::class);
    }
}

