<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->enum('role', ['owner', 'admin', 'courier']);
            $t->enum('status', ['pending', 'active', 'rejected', 'suspended'])->default('active'); // couriers start 'pending'
            $t->string('name', 120);
            $t->string('email', 160)->nullable();
            $t->string('phone', 32)->nullable();
            $t->string('password');
            $t->string('vehicle_plate', 20)->nullable();        // courier
            $t->integer('vehicle_capacity')->nullable();        // courier
            $t->string('fcm_token')->nullable();
            $t->foreignUuid('approved_by')->nullable()->constrained('users');
            $t->timestamp('approved_at')->nullable();
            $t->rememberToken();
            $t->timestamps();
            $t->unique(['company_id', 'email']);
            $t->index(['company_id', 'role', 'status']);
        });

        Schema::create('password_reset_tokens', function (Blueprint $t) {
            $t->string('email')->primary();
            $t->string('token');
            $t->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->uuid('user_id')->nullable()->index();
            $t->string('ip_address', 45)->nullable();
            $t->text('user_agent')->nullable();
            $t->longText('payload');
            $t->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
