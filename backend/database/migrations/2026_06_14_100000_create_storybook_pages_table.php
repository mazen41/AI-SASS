<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storybook_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained()->onDelete('cascade');
            $table->integer('page_number');
            $table->string('page_type');
            $table->string('title')->nullable();
            $table->string('content')->nullable();
            $table->string('dialogue')->nullable();
            $table->string('illustration_prompt')->nullable();
            $table->string('illustration_url')->nullable();
            $table->string('background_url')->nullable();
            $table->json('decorative_elements')->nullable();
            $table->string('layout_type')->nullable();
            $table->string('text_position')->nullable();
            $table->string('color_scheme')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['story_id', 'page_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storybook_pages');
    }
};
