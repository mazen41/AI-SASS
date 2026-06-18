<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            // Counter of async output jobs still pending for this story.
            // Decremented atomically by each terminal job
            // (GenerateNarrationJob, GenerateStoryBookJob, GenerateColoringBookJob,
            // AssembleVideoJob, or GenerateImagesJob for the images-only-no-downstream case).
            // When it reaches 0, the story is marked 'completed'.
            $table->unsignedInteger('pending_outputs_count')->default(0)->after('selected_outputs');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn('pending_outputs_count');
        });
    }
};
