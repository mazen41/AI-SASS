<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        $columns = [];
        foreach (['social_token', 'social_refresh_token'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                $columns[$column] = null;
            }
        }

        if ($columns !== []) {
            // These provider credentials are not used by the app after sign-in.
            // Clear persisted secrets; intentionally irreversible on rollback.
            DB::table('users')->update($columns);
        }
    }

    public function down(): void
    {
        // Cleared provider credentials cannot and should not be restored.
    }
};
