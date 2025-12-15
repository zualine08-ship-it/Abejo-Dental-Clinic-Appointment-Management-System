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
            if (!Schema::hasColumn('appointments', 'rescheduled_by')) {
                $table->enum('rescheduled_by', ['patient', 'admin'])->nullable()->after('reschedule_reason_details')->comment('Who rescheduled the appointment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'rescheduled_by')) {
                $table->dropColumn('rescheduled_by');
            }
        });
    }
};
