<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Holds a registration attempt in limbo until BOTH:
 *   1. The email OTP is verified, AND
 *   2. Payment succeeds (skipped only for free packages).
 *
 * No row in `users` is created until completion — this is what makes
 * "package required + payment required before account exists" enforceable
 * at the database level, not just in application logic.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table) {
            // UUID primary key: unguessable, safe to expose to the frontend
            // for polling (/register/status/{id}) without an auth token.
            $table->uuid('id')->primary();

            $table->string('name');
            $table->string('email')->index();
            $table->string('password_hash'); // already-hashed, never plaintext
            $table->foreignId('package_id')->constrained('packages');

            // OTP
            $table->string('otp_hash')->nullable();
            $table->timestamp('otp_expires_at')->nullable();
            $table->unsignedTinyInteger('otp_attempts')->default(0);
            $table->unsignedTinyInteger('otp_resend_count')->default(0);
            $table->timestamp('last_otp_sent_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();

            // pending_otp -> otp_verified -> (awaiting_payment ->) completed
            // 'expired' / 'failed' are terminal dead-ends.
            $table->string('status')->default('pending_otp');

            $table->string('moyasar_payment_id')->nullable()->index();
            $table->foreignId('created_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('token_claimed_at')->nullable();

            // Whole record expires (abandoned signups) independent of OTP expiry.
            $table->timestamp('expires_at');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
