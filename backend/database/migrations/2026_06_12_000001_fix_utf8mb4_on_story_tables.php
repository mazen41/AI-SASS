<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Convert all story-related text columns to utf8mb4 so Arabic, emoji,
     * and other multi-byte characters can be stored without errors.
     */
    public function up(): void
    {
        // MySQL-only: this collation conversion has no equivalent (or need)
        // on SQLite/Postgres, which are already UTF-8 by default. Without
        // this guard, `php artisan migrate` fails outright on any non-MySQL
        // connection (e.g. local/testing with sqlite), blocking every
        // migration after this one.
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        $tables = [
            'stories'     => ['title', 'content', 'error_message', 'custom_prompt'],
            'story_assets'=> ['url', 'prompt'],
            'ai_job_logs' => ['step', 'error'],
        ];

        foreach ($tables as $table => $columns) {
            // Convert the whole table to utf8mb4 first
            DB::statement("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    public function down(): void
    {
        // Intentionally not reverting — utf8mb4 is strictly better
    }
};
