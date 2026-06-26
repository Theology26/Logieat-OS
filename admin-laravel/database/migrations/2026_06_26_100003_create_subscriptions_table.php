<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->string('plan', 40);                              // 'pro_monthly' | 'pro_yearly'
            $t->decimal('amount', 12, 2);
            $t->string('method', 20);                            // 'qris' | 'va' | 'ewallet'
            $t->enum('status', ['inactive', 'active', 'expired', 'cancelled'])->default('active');
            $t->dateTime('period_start');
            $t->dateTime('period_end');
            $t->dateTime('paid_at')->nullable();
            $t->timestamps();
            $t->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
