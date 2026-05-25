<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StorageSetting;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StorageSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = StorageSetting::all()->keyBy('driver');
        $drivers = ['local', 's3', 'wasabi'];

        foreach ($drivers as $driver) {
            if (!isset($settings[$driver])) {
                $settings[$driver] = StorageSetting::create([
                    'driver' => $driver,
                    'is_active' => $driver === 'local',
                ]);
            }
        }

        $response = [];
        foreach ($settings as $driver => $setting) {
            $response[$driver] = [
                'id' => $setting->id,
                'driver' => $setting->driver,
                'is_active' => $setting->is_active,
                'region' => $setting->region,
                'bucket' => $setting->bucket,
                'endpoint' => $setting->endpoint,
                'use_path_style_endpoint' => $setting->use_path_style_endpoint,
                'has_key' => !empty($setting->getRawOriginal('key')),
                'has_secret' => !empty($setting->getRawOriginal('secret')),
            ];
        }

        return response()->json(['settings' => $response]);
    }

    public function update(Request $request, string $driver): JsonResponse
    {
        if (!in_array($driver, ['local', 's3', 'wasabi'])) {
            return response()->json(['message' => 'Invalid storage driver.'], 422);
        }

        $validated = $request->validate([
            'is_active' => 'boolean',
            'key' => 'nullable|string',
            'secret' => 'nullable|string',
            'region' => 'nullable|string',
            'bucket' => 'nullable|string',
            'endpoint' => 'nullable|string',
            'use_path_style_endpoint' => 'boolean',
        ]);

        $setting = StorageSetting::firstOrCreate(
            ['driver' => $driver],
            ['is_active' => false]
        );

        $oldValues = [
            'is_active' => $setting->is_active,
            'region' => $setting->region,
            'bucket' => $setting->bucket,
        ];

        // Filter null values but keep public fields
        $updateData = array_filter($validated, fn($v) => $v !== null);

        $setting->update($updateData);

        if ($setting->is_active) {
            // Deactivate all other drivers
            StorageSetting::where('driver', '!=', $driver)->update(['is_active' => false]);
        }

        // Log to activity log
        ActivityLog::log(
            userId: auth()->id(),
            action: 'storage_settings_updated',
            entityType: 'StorageSetting',
            entityId: $setting->id,
            oldValues: $oldValues,
            newValues: [
                'is_active' => $setting->is_active,
                'driver' => $driver,
                'bucket' => $setting->bucket,
            ]
        );

        return response()->json([
            'message' => ucfirst($driver) . ' storage settings updated successfully.',
            'setting' => [
                'id' => $setting->id,
                'driver' => $setting->driver,
                'is_active' => $setting->is_active,
                'region' => $setting->region,
                'bucket' => $setting->bucket,
                'endpoint' => $setting->endpoint,
                'use_path_style_endpoint' => $setting->use_path_style_endpoint,
                'has_key' => !empty($setting->getRawOriginal('key')),
                'has_secret' => !empty($setting->getRawOriginal('secret')),
            ]
        ]);
    }

    public function testConnection(string $driver): JsonResponse
    {
        $setting = StorageSetting::where('driver', $driver)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => ucfirst($driver) . ' is not configured.'
            ]);
        }

        try {
            // Apply this configuration temporarily to test it
            $setting->applyConfiguration();
            $testFileName = 'test-connection-' . time() . '.txt';
            $disk = $driver === 'local' ? 'public' : $driver;

            Storage::disk($disk)->put($testFileName, 'StoryHero Connection Test');
            
            if (Storage::disk($disk)->exists($testFileName)) {
                Storage::disk($disk)->delete($testFileName);
                
                // Reapply the active configuration
                $activeSetting = StorageSetting::getActive();
                if ($activeSetting) {
                    $activeSetting->applyConfiguration();
                }

                return response()->json([
                    'success' => true,
                    'message' => ucfirst($driver) . ' connection successful.'
                ]);
            }
        } catch (\Exception $e) {
            // Reapply active configuration on error
            $activeSetting = StorageSetting::getActive();
            if ($activeSetting) {
                $activeSetting->applyConfiguration();
            }

            return response()->json([
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage()
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to write test file.'
        ]);
    }
}
