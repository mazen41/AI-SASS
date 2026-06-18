<?php
// Run with: php artisan tinker --execute="require 'fix_storybook_urls.php';"
// Or: php fix_storybook_urls.php (from backend dir)

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Story;
use App\Models\StoryOutput;

// Fix all stories that have a full URL stored instead of a relative path
$stories = Story::whereNotNull('storybook_url')
    ->where('storybook_url', 'not like', '/api/%')
    ->get();

foreach ($stories as $story) {
    $newUrl = '/api/stories/' . $story->id . '/storybook';
    echo "Fixing story #{$story->id}: {$story->storybook_url} -> {$newUrl}\n";
    $story->update(['storybook_url' => $newUrl]);

    // Also fix the StoryOutput url
    StoryOutput::where('story_id', $story->id)
        ->where('output_type', 'story_book_pdf')
        ->update(['url' => $newUrl]);
}

echo "Done. Fixed " . count($stories) . " stories.\n";
