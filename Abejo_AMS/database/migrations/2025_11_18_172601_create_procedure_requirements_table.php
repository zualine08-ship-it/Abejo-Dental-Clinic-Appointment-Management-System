<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('procedure_requirements', function (Blueprint $table) {
            $table->id();
            
            // Foreign key to procedures table
            $table->foreignId('procedure_id')->constrained('procedures')->onDelete('cascade');
            
            // Foreign key to inventories table
            $table->foreignId('inventory_id')->constrained('inventories')->onDelete('cascade');
            
            // Quantity of this inventory item needed for the procedure
            $table->integer('quantity_required')->default(1);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procedure_requirements');
    }
};
