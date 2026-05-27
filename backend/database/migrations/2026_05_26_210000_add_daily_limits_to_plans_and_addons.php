<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('daily_story_limit')->default(0)->after('price');
            $table->integer('daily_video_limit')->default(0)->after('daily_story_limit');
        });

        Schema::table('plan_addons', function (Blueprint $table) {
            $table->integer('daily_story_limit')->default(0)->after('price');
            $table->integer('daily_video_limit')->default(0)->after('daily_story_limit');
        });
    }

    public function down(): void
    {
        Schema::table('plan_addons', function (Blueprint $table) {
            $table->dropColumn(['daily_story_limit', 'daily_video_limit']);
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['daily_story_limit', 'daily_video_limit']);
        });
    }
};
