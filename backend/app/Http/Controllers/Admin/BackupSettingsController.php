<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BackupSetting;
use App\Models\ActivityLog;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BackupSettingsController extends Controller
{
    protected BackupService $backupService;

    public function __construct(BackupService $backupService)
    {
        $this->backupService = $backupService;
    }

    public function index(): JsonResponse
    {
        $settings = BackupSetting::first();

        if (!$settings) {
            $settings = BackupSetting::create([
                'is_enabled' => false,
                'destination' => 'local',
                'local_path' => 'backups',
                'backup_time' => '00:00',
            ]);
        }

        return response()->json([
            'settings' => [
                'id' => $settings->id,
                'is_enabled' => $settings->is_enabled,
                'destination' => $settings->destination,
                'local_path' => $settings->local_path,
                'region' => $settings->region,
                'bucket' => $settings->bucket,
                'endpoint' => $settings->endpoint,
                'google_folder_id' => $settings->google_folder_id,
                'backup_time' => $settings->backup_time,
                'has_s3_key' => !empty($settings->getRawOriginal('s3_key')),
                'has_s3_secret' => !empty($settings->getRawOriginal('s3_secret')),
                'has_google_json_key' => !empty($settings->getRawOriginal('google_json_key')),
            ]
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_enabled' => 'boolean',
            'destination' => 'string|in:local,s3,wasabi,google_drive',
            'local_path' => 'nullable|string',
            's3_key' => 'nullable|string',
            's3_secret' => 'nullable|string',
            'region' => 'nullable|string',
            'bucket' => 'nullable|string',
            'endpoint' => 'nullable|string',
            'google_folder_id' => 'nullable|string',
            'google_json_key' => 'nullable|string',
            'backup_time' => 'string|regex:/^\d{2}:\d{2}$/',
        ]);

        $settings = BackupSetting::firstOrCreate([], [
            'is_enabled' => false,
            'destination' => 'local',
            'local_path' => 'backups',
        ]);

        $oldValues = [
            'is_enabled' => $settings->is_enabled,
            'destination' => $settings->destination,
            'backup_time' => $settings->backup_time,
        ];

        $updateData = array_filter($validated, fn($v) => $v !== null);
        $settings->update($updateData);

        ActivityLog::log(
            userId: auth()->id(),
            action: 'backup_settings_updated',
            entityType: 'BackupSetting',
            entityId: $settings->id,
            oldValues: $oldValues,
            newValues: [
                'is_enabled' => $settings->is_enabled,
                'destination' => $settings->destination,
                'backup_time' => $settings->backup_time,
            ]
        );

        return response()->json([
            'message' => 'Backup settings updated successfully.',
            'settings' => [
                'id' => $settings->id,
                'is_enabled' => $settings->is_enabled,
                'destination' => $settings->destination,
                'local_path' => $settings->local_path,
                'region' => $settings->region,
                'bucket' => $settings->bucket,
                'endpoint' => $settings->endpoint,
                'google_folder_id' => $settings->google_folder_id,
                'backup_time' => $settings->backup_time,
                'has_s3_key' => !empty($settings->getRawOriginal('s3_key')),
                'has_s3_secret' => !empty($settings->getRawOriginal('s3_secret')),
                'has_google_json_key' => !empty($settings->getRawOriginal('google_json_key')),
            ]
        ]);
    }

    public function runBackup(): JsonResponse
    {
        $result = $this->backupService->runBackup();

        if ($result['success']) {
            ActivityLog::log(
                userId: auth()->id(),
                action: 'backup_manually_triggered',
                entityType: 'Backup',
                entityId: null,
                oldValues: null,
                newValues: ['filename' => $result['filename']]
            );
        }

        return response()->json($result);
    }

    public function downloadBackup(Request $request): Response
    {
        $token = $request->query('api_token');
        $authorized = false;
        $adminUser = null;

        if ($token) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken && $accessToken->tokenable) {
                $user = $accessToken->tokenable;
                if ($user->isAdmin() && $user->isActive()) {
                    $authorized = true;
                    $adminUser = $user;
                }
            }
        }

        if (!$authorized) {
            return response('Unauthorized. Admin access required.', 403);
        }

        try {
            $sql = $this->backupService->generateBackupSql();
            $gzipped = gzencode($sql, 9);
            $fileName = 'backup-' . now()->format('Y-m-d-H-i-s') . '.sql.gz';

            ActivityLog::log(
                userId: $adminUser->id,
                action: 'backup_downloaded',
                entityType: 'Backup',
                entityId: null
            );

            return response($gzipped)
                ->header('Content-Type', 'application/x-gzip')
                ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"');
        } catch (\Exception $e) {
            return response('Backup download failed: ' . $e->getMessage(), 500);
        }
    }
}
