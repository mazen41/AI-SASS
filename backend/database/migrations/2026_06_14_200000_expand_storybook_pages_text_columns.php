<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storybook_pages', function (Blueprint $table) {
            // varchar(255) is too short for AI-generated prompts — expand to TEXT
            $table->text('illustration_prompt')->nullable()->change();
            $table->text('title')->nullable()->change();
            $table->text('content')->nullable()->change();
            $table->text('dialogue')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('storybook_pages', function (Blueprint $table) {
            $table->string('illustration_prompt')->nullable()->change();
            $table->string('title')->nullable()->change();
            $table->string('content')->nullable()->change();
            $table->string('dialogue')->nullable()->change();
        });
    }
};