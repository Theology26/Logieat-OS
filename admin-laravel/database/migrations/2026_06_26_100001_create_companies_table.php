<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('name', 160);
            $t->string('owner_name', 120);
            $t->string('phone', 32);
            $t->string('email', 160)->unique();
            $t->string('catering_code', 32)->unique();          // random hash, NOT serial
            $t->string('depot_address', 255)->nullable();
            $t->double('depot_lat')->nullable();
            $t->double('depot_lng')->nullable();
            $t->integer('vehicle_capacity_default')->default(100);
            $t->enum('subscription_status', ['inactive', 'active', 'expired', 'cancelled'])->default('inactive');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
