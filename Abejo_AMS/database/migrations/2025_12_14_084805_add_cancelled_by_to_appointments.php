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
            if (!Schema::hasColumn('appointments', 'cancelled_by')) {
                $table->enum('cancelled_by', ['patient', 'admin'])->nullable()->after('cancellation_reason_details')->comment('Who cancelled the appointment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'cancelled_by')) {
                $table->dropColumn('cancelled_by');
            }
        });
    }
};
