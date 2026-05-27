<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'title_en',
        'title_ar',
        'slug',
        'content_en',
        'content_ar',
        'category_en',
        'category_ar',
        'image_url',
        'author_en',
        'author_ar',
        'is_published',
        'published_at',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        // Auto-generate slug from English title on creating if not specified
        static::creating(function ($post) {
            if (empty($post->slug)) {
                $post->slug = Str::slug($post->title_en);
            }
            if (empty($post->published_at)) {
                $post->published_at = now();
            }
        });
    }
}
