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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('role');
            $table->date('date_of_birth')->nullable()->after('phone');
            $table->string('address')->nullable()->after('date_of_birth');
            $table->string('blood_type')->nullable()->after('address');
            $table->string('emergency_contact')->nullable()->after('blood_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'date_of_birth', 'address', 'blood_type', 'emergency_contact']);
        });
    }
};
