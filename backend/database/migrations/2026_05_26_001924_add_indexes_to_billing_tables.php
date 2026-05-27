<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->safeAddIndex('subscriptions', function (Blueprint $table) {
            $table->index('gateway_subscription_id');
        });

        $this->safeAddIndex('users', function (Blueprint $table) {
            $table->index(['social_provider', 'social_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->safeDropIndex('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['gateway_subscription_id']);
        });

        $this->safeDropIndex('users', function (Blueprint $table) {
            $table->dropIndex(['social_provider', 'social_id']);
        });
    }

    private function safeAddIndex(string $table, Closure $callback): void
    {
        try {
            Schema::table($table, $callback);
        } catch (\Exception $e) {
            Log::info("Safe migration: Index on table '{$table}' could not be added (it might already exist).");
        }
    }

    private function safeDropIndex(string $table, Closure $callback): void
    {
        try {
            Schema::table($table, $callback);
        } catch (\Exception $e) {
            Log::info("Safe migration: Index on table '{$table}' could not be dropped.");
        }
    }
};
