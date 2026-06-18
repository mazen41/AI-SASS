<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->json('storybook_data')->nullable()->after('selected_outputs');
            $table->string('storybook_url')->nullable()->after('video_url');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn(['storybook_data', 'storybook_url']);
        });
    }
};
