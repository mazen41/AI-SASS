<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repairs installations where the original migration was recorded as run
     * but the table is missing. Never drops or alters an existing table.
     */
    public function up(): void
    {
        if (Schema::hasTable('myfatoorah_checkout_sessions')) {
            return;
        }

        Schema::create('myfatoorah_checkout_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('pending_registration_id')->nullable()->index();
            $table->string('invoice_id')->nullable()->unique();
            $table->string('payment_id')->nullable()->index();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('SAR');
            $table->string('status')->default('pending');
            $table->json('gateway_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Intentionally retain data: this migration only repairs a missing
        // production table and must be safe to roll back in an emergency.
    }
};
