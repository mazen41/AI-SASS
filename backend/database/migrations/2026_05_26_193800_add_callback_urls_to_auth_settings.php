<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auth_settings', function (Blueprint $table) {
            $table->string('google_callback_url')->nullable()->after('google_client_secret');
            $table->string('facebook_callback_url')->nullable()->after('facebook_client_secret');
            $table->string('apple_callback_url')->nullable()->after('apple_client_secret');
        });
    }

    public function down(): void
    {
        Schema::table('auth_settings', function (Blueprint $table) {
            $table->dropColumn(['google_callback_url', 'facebook_callback_url', 'apple_callback_url']);
        });
    }
};
