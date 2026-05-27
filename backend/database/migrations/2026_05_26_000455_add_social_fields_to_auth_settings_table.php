<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('auth_settings', function (Blueprint $table) {
            $table->boolean('google_active')->default(false);
            $table->string('google_client_id')->nullable();
            $table->string('google_client_secret')->nullable();
            
            $table->boolean('facebook_active')->default(false);
            $table->string('facebook_client_id')->nullable();
            $table->string('facebook_client_secret')->nullable();
            
            $table->boolean('apple_active')->default(false);
            $table->string('apple_client_id')->nullable();
            $table->string('apple_client_secret')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auth_settings', function (Blueprint $table) {
            $table->dropColumn([
                'google_active', 'google_client_id', 'google_client_secret',
                'facebook_active', 'facebook_client_id', 'facebook_client_secret',
                'apple_active', 'apple_client_id', 'apple_client_secret',
            ]);
        });
    }
};
