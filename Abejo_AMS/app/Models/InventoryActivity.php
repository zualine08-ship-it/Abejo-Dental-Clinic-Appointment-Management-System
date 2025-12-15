<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_id',
        'activity_type',
        'quantity_changed',
        'previous_quantity',
        'new_quantity',
        'reason',
        'notes'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }
}
