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
        Schema::table('patient_histories', function (Blueprint $table) {
            if (!Schema::hasColumn('patient_histories', 'appointment_id')) {
                $table->foreignId('appointment_id')->nullable()->constrained('appointments')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_histories', function (Blueprint $table) {
            if (Schema::hasColumn('patient_histories', 'appointment_id')) {
                $table->dropForeignIdFor('Appointment');
                $table->dropColumn('appointment_id');
            }
        });
    }
};
