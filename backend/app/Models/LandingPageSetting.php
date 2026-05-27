<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageSetting extends Model
{
    protected $fillable = [
        'faqs',
        'footer_tagline_en',
        'footer_tagline_ar',
        'contact_email',
        'contact_phone',
        'social_links',
        'privacy_policy_en',
        'privacy_policy_ar',
        'terms_of_service_en',
        'terms_of_service_ar',
        'footer_sections',
        'about_content_en',
        'about_content_ar',
        'careers_content_en',
        'careers_content_ar',
        'examples_content_en',
        'examples_content_ar',
    ];

    protected $casts = [
        'faqs' => 'array',
        'social_links' => 'array',
        'footer_sections' => 'array',
    ];
}
