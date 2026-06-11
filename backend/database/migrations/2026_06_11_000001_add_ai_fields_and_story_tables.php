<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add AI fields to stories table
        Schema::table('stories', function (Blueprint $table) {
            $table->string('processing_step')->nullable()->after('status');
            $table->text('error_message')->nullable()->after('processing_step');
            $table->text('custom_prompt')->nullable()->after('error_message');
            $table->string('narration_url')->nullable()->after('video_url');
            $table->string('assembled_video_url')->nullable()->after('narration_url');
        });

        // story_assets table
        Schema::create('story_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained()->onDelete('cascade');
            $table->integer('scene_number');
            $table->string('asset_type'); // image, video
            $table->string('url');
            $table->text('prompt')->nullable();
            $table->timestamps();
            $table->index(['story_id', 'scene_number']);
        });

        // ai_job_logs table
        Schema::create('ai_job_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained()->onDelete('cascade');
            $table->string('step'); // generate_story, generate_images, generate_videos, generate_narration, assemble_video
            $table->string('status'); // started, completed, failed
            $table->json('meta')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->index(['story_id', 'step']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_job_logs');
        Schema::dropIfExists('story_assets');
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn(['processing_step', 'error_message', 'custom_prompt', 'narration_url', 'assembled_video_url']);
        });
    }
};
