<?php

namespace Tests\Unit;

use App\Services\PrivateImageStorage;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrivateImageStorageTest extends TestCase
{
    public function test_image_storage_persists_only_a_private_r2_reference(): void
    {
        Storage::fake('r2');

        $storage = app(PrivateImageStorage::class);
        $reference = $storage->storeBytes('stories/42/scene_1.jpg', 'image-bytes', 'image/jpeg');

        $this->assertSame('r2://stories/42/scene_1.jpg', $reference);
        $this->assertTrue($storage->isReference($reference));
        $this->assertSame('stories/42/scene_1.jpg', $storage->pathFromReference($reference));
        Storage::disk('r2')->assertExists('stories/42/scene_1.jpg');
    }

    public function test_non_r2_urls_remain_compatible_with_legacy_image_records(): void
    {
        $storage = app(PrivateImageStorage::class);
        $legacyUrl = 'https://cdn.example.test/legacy-image.jpg';

        $this->assertFalse($storage->isReference($legacyUrl));
        $this->assertSame($legacyUrl, $storage->url($legacyUrl));
    }
}
