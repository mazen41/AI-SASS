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
        Schema::table('users', function (Blueprint $table) {
            $table->string('social_provider')->nullable()->after('avatar');
            $table->string('social_id')->nullable()->after('social_provider');
            $table->text('social_token')->nullable()->after('social_id');
            $table->text('social_refresh_token')->nullable()->after('social_token');
            $table->timestamp('email_verified_at')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['social_provider', 'social_id', 'social_token', 'social_refresh_token']);
        });
    }
};
