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
        Schema::create('inventory_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained()->onDelete('cascade');
            $table->string('activity_type'); // 'added', 'restocked', 'updated', 'used'
            $table->integer('quantity_changed')->default(0); // positive for additions, negative for usage
            $table->integer('previous_quantity')->nullable();
            $table->integer('new_quantity')->nullable();
            $table->string('reason')->nullable(); // 'initial', 'restock', 'usage', etc.
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Add last_restock_date to inventories table if it doesn't exist
        Schema::table('inventories', function (Blueprint $table) {
            if (!Schema::hasColumn('inventories', 'last_restock_date')) {
                $table->timestamp('last_restock_date')->nullable()->after('stock_quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_activities');
        
        Schema::table('inventories', function (Blueprint $table) {
            if (Schema::hasColumn('inventories', 'last_restock_date')) {
                $table->dropColumn('last_restock_date');
            }
        });
    }
};
