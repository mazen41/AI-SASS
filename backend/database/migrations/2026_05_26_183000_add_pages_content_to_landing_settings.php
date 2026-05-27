<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('landing_page_settings', function (Blueprint $table) {
            $table->longText('about_content_en')->nullable();
            $table->longText('about_content_ar')->nullable();
            $table->longText('careers_content_en')->nullable();
            $table->longText('careers_content_ar')->nullable();
            $table->longText('examples_content_en')->nullable();
            $table->longText('examples_content_ar')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landing_page_settings', function (Blueprint $table) {
            $table->dropColumn([
                'about_content_en',
                'about_content_ar',
                'careers_content_en',
                'careers_content_ar',
                'examples_content_en',
                'examples_content_ar'
            ]);
        });
    }
};
