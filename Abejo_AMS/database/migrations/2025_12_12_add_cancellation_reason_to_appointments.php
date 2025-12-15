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
            // Skip if columns already exist
            if (!Schema::hasColumn('appointments', 'cancellation_reason')) {
                $table->string('cancellation_reason')->nullable()->after('reschedule_reason_details');
            }
            if (!Schema::hasColumn('appointments', 'cancellation_reason_details')) {
                $table->text('cancellation_reason_details')->nullable()->after('cancellation_reason');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'cancellation_reason_details']);
        });
    }
};
