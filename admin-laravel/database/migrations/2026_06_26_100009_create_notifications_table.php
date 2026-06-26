<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $t->enum('type', ['new_task', 'route_update', 'delivered', 'chat', 'approval', 'system']);
            $t->string('title', 160);
            $t->string('body', 512)->nullable();
            $t->string('color', 16)->nullable();                 // danger|warning|success|info
            $t->json('data')->nullable();                        // deep-link payload
            $t->dateTime('read_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
