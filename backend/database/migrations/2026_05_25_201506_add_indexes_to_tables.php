<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    public function up(): void
    {
        // Safely add indexes and ignore duplicate key errors
        $this->safeAddIndex('activity_logs', function (Blueprint $table) {
            $table->index('created_at');
        });
        
        $this->safeAddIndex('activity_logs', function (Blueprint $table) {
            $table->index('action');
        });

        $this->safeAddIndex('users', function (Blueprint $table) {
            $table->index('role');
        });

        $this->safeAddIndex('users', function (Blueprint $table) {
            $table->index('status');
        });

        $this->safeAddIndex('subscriptions', function (Blueprint $table) {
            $table->index('status');
        });

        $this->safeAddIndex('subscriptions', function (Blueprint $table) {
            $table->index('created_at');
        });

        $this->safeAddIndex('transactions', function (Blueprint $table) {
            $table->index('status');
        });

        $this->safeAddIndex('transactions', function (Blueprint $table) {
            $table->index('created_at');
        });

        $this->safeAddIndex('transactions', function (Blueprint $table) {
            $table->index('gateway');
        });
    }

    public function down(): void
    {
        // Safely drop indexes
        $this->safeDropIndex('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        $this->safeDropIndex('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['action']);
        });

        $this->safeDropIndex('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        $this->safeDropIndex('users', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        $this->safeDropIndex('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        $this->safeDropIndex('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        $this->safeDropIndex('transactions', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        $this->safeDropIndex('transactions', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        $this->safeDropIndex('transactions', function (Blueprint $table) {
            $table->dropIndex(['gateway']);
        });
    }

    private function safeAddIndex(string $table, Closure $callback): void
    {
        try {
            Schema::table($table, $callback);
        } catch (\Exception $e) {
            // Log or ignore if the index already exists
            Log::info("Safe migration: Index on table '{$table}' could not be added (it might already exist). Message: " . $e->getMessage());
        }
    }

    private function safeDropIndex(string $table, Closure $callback): void
    {
        try {
            Schema::table($table, $callback);
        } catch (\Exception $e) {
            // Log or ignore if index doesn't exist
            Log::info("Safe migration: Index on table '{$table}' could not be dropped. Message: " . $e->getMessage());
        }
    }
};
