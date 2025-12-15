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
            if (!Schema::hasColumn('appointments', 'rating')) {
                $table->integer('rating')->nullable()->after('cancellation_reason_details');
            }
            if (!Schema::hasColumn('appointments', 'comment')) {
                $table->text('comment')->nullable()->after('rating');
            }
            if (!Schema::hasColumn('appointments', 'rating_date')) {
                $table->timestamp('rating_date')->nullable()->after('comment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'rating')) {
                $table->dropColumn('rating');
            }
            if (Schema::hasColumn('appointments', 'comment')) {
                $table->dropColumn('comment');
            }
            if (Schema::hasColumn('appointments', 'rating_date')) {
                $table->dropColumn('rating_date');
            }
        });
    }
};
