<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Private R2 storage for generated and user supplied images. */
class PrivateImageStorage
{
    private const DISK = 'r2';
    private const REFERENCE_PREFIX = 'r2://';

    public function storeUploaded(UploadedFile $file, string $path): string
    {
        $mime = $file->getMimeType() ?: 'application/octet-stream';
        $this->assertImage($file->getRealPath());
        return $this->storeBytes($path, file_get_contents($file->getRealPath()), $mime);
    }

    public function storeDownloaded(string $url, string $path): string
    {
        $response = \Illuminate\Support\Facades\Http::timeout(120)->get($url);
        if (!$response->successful()) {
            throw new RuntimeException('Generated image could not be downloaded.');
        }

        $bytes = $response->body();
        $mime = strtolower(trim(explode(';', $response->header('Content-Type', 'image/jpeg'))[0]));
        $temporary = tempnam(sys_get_temp_dir(), 'naz-image-');
        try {
            file_put_contents($temporary, $bytes);
            $this->assertImage($temporary);
        } finally {
            @unlink($temporary);
        }

        if (!str_starts_with($mime, 'image/')) {
            throw new RuntimeException('Generated asset response was not an image.');
        }

        return $this->storeBytes($path, $bytes, $mime);
    }

    public function storeBytes(string $path, string $bytes, string $mime = 'image/jpeg'): string
    {
        if (!str_starts_with(strtolower($mime), 'image/')) {
            throw new RuntimeException('Only image content can be stored in the private image bucket.');
        }
        if ($bytes === '') {
            throw new RuntimeException('Image content is empty.');
        }

        Storage::disk(self::DISK)->put($path, $bytes, [
            'visibility' => 'private',
            'ContentType' => $mime,
        ]);

        return self::REFERENCE_PREFIX . ltrim($path, '/');
    }

    public function url(?string $reference): ?string
    {
        if (!$reference) return null;
        if (!$this->isReference($reference)) return $reference;

        $path = $this->pathFromReference($reference);
        return Storage::disk(self::DISK)->temporaryUrl($path, now()->addMinutes(15));
    }

    public function isReference(?string $reference): bool
    {
        return is_string($reference) && str_starts_with($reference, self::REFERENCE_PREFIX);
    }

    public function pathFromReference(string $reference): string
    {
        if (!$this->isReference($reference)) {
            throw new RuntimeException('Image reference is not an R2 object reference.');
        }
        return ltrim(substr($reference, strlen(self::REFERENCE_PREFIX)), '/');
    }

    /** Copy an R2 image to a temporary local file for image libraries/Fal.ai. */
    public function materialize(string $reference, ?string $extension = null): string
    {
        if (!$this->isReference($reference)) {
            throw new RuntimeException('Cannot materialize a non-R2 image reference.');
        }
        $path = $this->pathFromReference($reference);
        $extension = $extension ?: pathinfo($path, PATHINFO_EXTENSION) ?: 'img';
        $temporary = tempnam(sys_get_temp_dir(), 'naz-private-image-');
        if ($temporary === false) throw new RuntimeException('Could not allocate temporary image file.');
        $target = $temporary . '.' . preg_replace('/[^a-z0-9]/i', '', $extension);
        @unlink($temporary);
        try {
            file_put_contents($target, Storage::disk(self::DISK)->get($path));
            $this->assertImage($target);
            return $target;
        } catch (\Throwable $e) {
            @unlink($target);
            throw $e;
        }
    }

    public function deleteReference(?string $reference): void
    {
        if ($this->isReference($reference)) {
            Storage::disk(self::DISK)->delete($this->pathFromReference($reference));
        }
    }

    public function deleteStoryImages(int $storyId): void
    {
        Storage::disk(self::DISK)->deleteDirectory("stories/{$storyId}");
    }

    private function assertImage(string|false $path): void
    {
        if (!$path || !is_file($path) || @getimagesize($path) === false) {
            throw new RuntimeException('Uploaded or generated file is not a valid image.');
        }
    }
}
