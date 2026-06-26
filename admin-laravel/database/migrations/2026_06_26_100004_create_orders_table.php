<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->string('code', 24);                              // '#1021' unique per company
            $t->string('recipient_name', 160);
            $t->string('recipient_phone', 32)->nullable();
            $t->string('menu_name', 200);
            $t->enum('food_category', ['Santan', 'Basah', 'Kering'])->nullable(); // drives Q10 in app.py
            $t->integer('quantity')->default(1);                 // = SchoolNode.demand
            $t->string('address', 255);
            $t->string('maps_link', 512)->nullable();
            $t->double('latitude');
            $t->double('longitude');
            $t->dateTime('deadline_at')->nullable();
            $t->double('time_window_minutes')->nullable();       // optional manual override
            $t->enum('status', ['pending', 'assigned', 'picked_up', 'delivered', 'cancelled'])->default('pending');
            $t->enum('spoilage_risk', ['critical', 'high', 'medium', 'low'])->nullable(); // cached from app.py
            $t->timestamps();
            $t->unique(['company_id', 'code']);
            $t->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
