<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('courier_id')->constrained('users');
            $t->enum('status', ['assigned', 'in_progress', 'completed', 'cancelled'])->default('assigned');
            $t->double('depot_lat');                             // snapshot at dispatch time
            $t->double('depot_lng');
            $t->double('temperature')->nullable();               // sent to app.py
            $t->double('total_distance_km')->nullable();
            $t->double('total_time_minutes')->nullable();
            $t->string('model_type', 60)->nullable();            // a2c_spoilage_aware_v2 | heuristic
            $t->json('risk_summary')->nullable();                // {critical,high,medium,low}
            $t->timestamps();
            $t->dateTime('started_at')->nullable();
            $t->dateTime('completed_at')->nullable();
            $t->index(['company_id', 'courier_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
