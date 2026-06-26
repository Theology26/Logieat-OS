<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_assignments', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('route_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('order_id')->constrained('orders');
            $t->integer('sequence');                             // 1..N from app.py
            $t->double('estimated_minutes')->nullable();
            $t->double('distance_km')->nullable();
            $t->enum('spoilage_risk', ['critical', 'high', 'medium', 'low'])->nullable();
            $t->double('minutes_until_spoilage')->nullable();
            $t->enum('status', ['pending', 'arrived', 'delivered', 'skipped'])->default('pending');
            $t->string('pod_photo_url', 512)->nullable();        // proof of delivery
            $t->double('pod_lat')->nullable();
            $t->double('pod_lng')->nullable();
            $t->dateTime('delivered_at')->nullable();
            $t->unique(['route_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_assignments');
    }
};
