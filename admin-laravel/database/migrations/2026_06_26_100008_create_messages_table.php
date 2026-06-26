<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('route_id')->nullable()->constrained()->nullOnDelete(); // thread context
            $t->foreignUuid('sender_id')->constrained('users');
            $t->uuid('recipient_id')->nullable();
            $t->text('body');
            $t->dateTime('read_at')->nullable();
            $t->timestamps();
            $t->index(['company_id', 'route_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
