<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title_en');
            $table->string('title_ar');
            $table->string('slug')->unique();
            $table->longText('content_en');
            $table->longText('content_ar');
            $table->string('category_en');
            $table->string('category_ar');
            $table->string('image_url')->nullable();
            $table->string('author_en')->default('StoryHero Team');
            $table->string('author_ar')->default('فريق ستوري هيرو');
            $table->boolean('is_published')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            
            // Add index for fast slug querying
            $table->index('slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
