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
        Schema::table('appointments', function (Blueprint $table) {
            // Add patient_info JSON column for walk-in patient details if not exists
            if (!Schema::hasColumn('appointments', 'patient_info')) {
                $table->json('patient_info')->nullable()->after('patient_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('patient_info');
            $table->foreignId('patient_id')->nullable(false)->change();
        });
    }
};
