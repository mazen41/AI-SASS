<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds two counter columns used by GenerateSingleSceneVideoJob's atomic barrier:
 *
 *   total_video_scenes     — set by GenerateSceneVideosJob when it dispatches N parallel jobs
 *   completed_video_scenes — atomically incremented by each GenerateSingleSceneVideoJob
 *
 * When completed_video_scenes reaches total_video_scenes, exactly one worker
 * dispatches AssembleVideoJob — preventing duplicate assembly from race conditions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->unsignedInteger('total_video_scenes')->default(0)->after('duration_seconds');
            $table->unsignedInteger('completed_video_scenes')->default(0)->after('total_video_scenes');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn(['total_video_scenes', 'completed_video_scenes']);
        });
    }
};
