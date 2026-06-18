<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storybook_pages', function (Blueprint $table) {
            $table->string('status')->default('planned')->after('page_type'); // planned, generating, completed, failed
            $table->string('narration_url')->nullable()->after('illustration_url');
            $table->unsignedInteger('narration_duration_ms')->nullable()->after('narration_url');
            $table->text('error_message')->nullable()->after('metadata');
        });
    }

    public function down(): void
    {
        Schema::table('storybook_pages', function (Blueprint $table) {
            $table->dropColumn(['status', 'narration_url', 'narration_duration_ms', 'error_message']);
        });
    }
};
