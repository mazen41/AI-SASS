<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('story_outputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained()->onDelete('cascade');
            $table->string('output_type'); // story_book_pdf, coloring_book_pdf, activity_book_pdf, final_video, narration_audio
            $table->string('status')->default('pending'); // pending, generating, completed, failed, planned
            $table->string('url')->nullable();
            $table->string('storage_path')->nullable();
            $table->json('metadata')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['story_id', 'output_type']);
            $table->index(['story_id', 'status']);
            $table->index('output_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('story_outputs');
    }
};
