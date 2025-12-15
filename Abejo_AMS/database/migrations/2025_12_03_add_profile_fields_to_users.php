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
            $table->string('gender')->nullable()->after('role');
            $table->integer('age')->nullable()->after('gender');
            $table->string('occupation')->nullable()->after('age');
            $table->string('work_address')->nullable()->after('occupation');
            $table->string('referred_by')->nullable()->after('work_address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['gender', 'age', 'occupation', 'work_address', 'referred_by']);
        });
    }
};
