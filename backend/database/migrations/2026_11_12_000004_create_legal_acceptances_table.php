<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->string('terms_version', 32)->nullable();
            $table->string('privacy_version', 32)->nullable();
            $table->timestamp('legal_accepted_at')->nullable();
        });

        Schema::create('legal_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('terms_version', 32);
            $table->string('privacy_version', 32);
            $table->timestamp('accepted_at');
            $table->string('source', 32)->default('registration');
            $table->timestamps();
            $table->index(['user_id', 'accepted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_acceptances');
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn(['terms_version', 'privacy_version', 'legal_accepted_at']);
        });
    }
};
