<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // one row per courier — fast live-map reads (upsert each GPS ping)
        Schema::create('current_locations', function (Blueprint $t) {
            $t->uuid('courier_id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->uuid('route_id')->nullable();
            $t->double('latitude');
            $t->double('longitude');
            $t->float('heading')->nullable();
            $t->float('speed_kmh')->nullable();
            $t->dateTime('recorded_at');
            $t->index('company_id', 'idx_curloc_company');
            $t->foreign('courier_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // append-only GPS trail — replay & km recap (optional)
        Schema::create('location_history', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->uuid('courier_id');
            $t->uuid('route_id')->nullable();
            $t->double('latitude');
            $t->double('longitude');
            $t->float('heading')->nullable();
            $t->float('speed_kmh')->nullable();
            $t->dateTime('recorded_at');
            $t->index(['courier_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_history');
        Schema::dropIfExists('current_locations');
    }
};
