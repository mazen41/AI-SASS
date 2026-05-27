<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_settings', function (Blueprint $table) {
            $table->id();
            
            // FAQs stored as JSON: Array of {q_en, a_en, q_ar, a_ar}
            $table->json('faqs')->nullable();
            
            // Footer & taglines
            $table->string('footer_tagline_en')->nullable();
            $table->string('footer_tagline_ar')->nullable();
            
            // Contact details
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->json('social_links')->nullable(); // {facebook, twitter, instagram, youtube}
            $table->json('footer_sections')->nullable(); // Dynamic footer sections and links
            
            // Policies
            $table->longText('privacy_policy_en')->nullable();
            $table->longText('privacy_policy_ar')->nullable();
            $table->longText('terms_of_service_en')->nullable();
            $table->longText('terms_of_service_ar')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_settings');
    }
};
