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
