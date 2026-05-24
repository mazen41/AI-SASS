<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('theme')->default('adventure');
            $table->string('child_name')->nullable();
            $table->integer('child_age')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('video_url')->nullable();
            $table->string('status')->default('draft'); // draft, processing, completed, failed
            $table->json('scenes')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->string('language')->default('en');
            $table->timestamps();
            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
