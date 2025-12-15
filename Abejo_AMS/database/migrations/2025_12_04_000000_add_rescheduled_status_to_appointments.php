<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For MySQL, we need to modify the enum column
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE appointments MODIFY status ENUM('pending', 'approved', 'completed', 'cancelled', 'rescheduled') DEFAULT 'pending'");
        } else {
            // For other databases, handle differently if needed
            Schema::table('appointments', function (Blueprint $table) {
                $table->string('status')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE appointments MODIFY status ENUM('pending', 'approved', 'completed', 'cancelled') DEFAULT 'pending'");
        }
    }
};
