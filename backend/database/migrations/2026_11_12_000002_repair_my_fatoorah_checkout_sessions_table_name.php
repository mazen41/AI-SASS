<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The earlier migration created the table without the separator used
        // by Laravel's MyFatoorahCheckoutSession model convention. Rename it
        // when possible so any rows are preserved, otherwise create the exact
        // table name Eloquent writes to.
        if (!Schema::hasTable('my_fatoorah_checkout_sessions')) {
            if (Schema::hasTable('myfatoorah_checkout_sessions')) {
                Schema::rename('myfatoorah_checkout_sessions', 'my_fatoorah_checkout_sessions');
                return;
            }

            Schema::create('my_fatoorah_checkout_sessions', function (Blueprint $table) {
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
    }

    public function down(): void
    {
        // Keep payment records intact during rollback.
    }
};
