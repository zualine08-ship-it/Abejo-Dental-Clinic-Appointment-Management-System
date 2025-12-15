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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->json('patient_info')->nullable();
            $table->foreignId('procedure_id')->constrained('procedures')->onDelete('cascade');
            $table->dateTime('appointment_date');
            $table->string('appointment_time')->nullable();
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled', 'rejected', 'rescheduled'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
