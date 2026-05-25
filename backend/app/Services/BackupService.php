<?php

namespace App\Services;

use App\Models\BackupSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BackupService
{
    public function generateBackupSql(): string
    {
        $tables = [];
        $result = DB::select('SHOW TABLES');
        
        $dbName = DB::connection()->getDatabaseName();
        $keyName = "Tables_in_" . $dbName;
        
        foreach ($result as $row) {
            $tables[] = $row->$keyName;
        }
        
        $sql = "-- StoryHero Database Backup\n";
        $sql .= "-- Generated: " . now()->toDateTimeString() . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
        
        foreach ($tables as $table) {
            $createStatement = DB::select("SHOW CREATE TABLE `{$table}`")[0];
            $createTableKey = 'Create Table';
            $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $sql .= $createStatement->$createTableKey . ";\n\n";
            
            $rows = DB::table($table)->get();
            foreach ($rows as $row) {
                $rowArray = (array) $row;
                if (empty($rowArray)) continue;

                $keys = array_keys($rowArray);
                $escapedKeys = array_map(fn($k) => "`{$k}`", $keys);
                
                $values = array_values($rowArray);
                $escapedValues = array_map(function($v) {
                    if ($v === null) return 'NULL';
                    if (is_int($v) || is_float($v)) return $v;
                    return "'" . addslashes($v) . "'";
                }, $values);
                
                $sql .= "INSERT INTO `{$table}` (" . implode(', ', $escapedKeys) . ") VALUES (" . implode(', ', $escapedValues) . ");\n";
            }
            $sql .= "\n";
        }
        
        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
        
        return $sql;
    }

    public function runBackup(?BackupSetting $settings = null): array
    {
        if (!$settings) {
            $settings = BackupSetting::getSettings();
        }

        if (!$settings) {
            return ['success' => false, 'message' => 'Backup settings not configured.'];
        }

        try {
            $sql = $this->generateBackupSql();
            $gzipped = gzencode($sql, 9);
            $fileName = 'backup-' . now()->format('Y-m-d-H-i-s') . '.sql.gz';
            $destination = $settings->destination;

            if ($destination === 'local') {
                $localPath = rtrim($settings->local_path ?: 'backups', '/');
                $fullPath = $localPath . '/' . $fileName;
                Storage::disk('local')->put($fullPath, $gzipped);
                
                return [
                    'success' => true,
                    'message' => "Database backup saved locally to storage/app/{$fullPath}",
                    'filename' => $fileName,
                ];
            }

            if ($destination === 's3' || $destination === 'wasabi') {
                $driver = $destination;
                $key = $settings->s3_key;
                $secret = $settings->s3_secret;
                $region = $settings->region ?: 'us-east-1';
                $bucket = $settings->bucket;
                $endpoint = $settings->endpoint;

                if (!$key || !$secret || !$bucket) {
                    throw new \Exception("Missing credentials for {$destination} backup.");
                }

                // Configure dynamic temporary backup disk
                config([
                    'filesystems.disks.backup_temp' => [
                        'driver' => 's3',
                        'key' => $key,
                        'secret' => $secret,
                        'region' => $region,
                        'bucket' => $bucket,
                        'endpoint' => $endpoint ?: ($driver === 'wasabi' ? "https://s3.{$region}.wasabisys.com" : null),
                        'use_path_style_endpoint' => $driver === 'wasabi',
                        'throw' => false,
                        'report' => false,
                    ]
                ]);

                Storage::disk('backup_temp')->put($fileName, $gzipped);

                return [
                    'success' => true,
                    'message' => "Database backup uploaded to {$destination} bucket: {$bucket}",
                    'filename' => $fileName,
                ];
            }

            if ($destination === 'google_drive') {
                $folderId = $settings->google_folder_id;
                $jsonKey = $settings->google_json_key;

                if (!$jsonKey) {
                    throw new \Exception("Missing Google Service Account JSON Key.");
                }

                $fileId = $this->uploadToGoogleDrive($gzipped, $fileName, $jsonKey, $folderId);

                return [
                    'success' => true,
                    'message' => "Database backup uploaded to Google Drive Folder (File ID: {$fileId})",
                    'filename' => $fileName,
                ];
            }

            throw new \Exception("Unsupported backup destination: {$destination}");
        } catch (\Exception $e) {
            Log::error('Database backup failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Backup failed: ' . $e->getMessage()];
        }
    }

    private function uploadToGoogleDrive(string $fileContent, string $fileName, string $jsonKeyContent, ?string $folderId): string
    {
        $jsonKey = json_decode($jsonKeyContent, true);
        if (!$jsonKey || !isset($jsonKey['client_email']) || !isset($jsonKey['private_key'])) {
            throw new \Exception("Invalid Google Service Account JSON Key format.");
        }

        $clientEmail = $jsonKey['client_email'];
        $privateKey = $jsonKey['private_key'];

        // 1. Generate JWT for OAuth
        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $clientEmail,
            'sub' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/drive.file',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]));

        $signature = '';
        if (!openssl_sign("$header.$payload", $signature, $privateKey, 'sha256WithRSAEncryption')) {
            throw new \Exception("openssl_sign failed. Please check your private key format.");
        }
        $signature = $this->base64UrlEncode($signature);

        $jwt = "$header.$payload.$signature";

        // 2. Request Access Token
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]);

        if (!$response->successful()) {
            throw new \Exception("Google Drive authentication failed: " . $response->body());
        }

        $accessToken = $response->json('access_token');

        // 3. Upload File via Multipart REST API
        $metadata = [
            'name' => $fileName,
        ];
        if ($folderId) {
            $metadata['parents'] = [$folderId];
        }

        $multipartResponse = Http::withToken($accessToken)
            ->asMultipart()
            ->attach('metadata', json_encode($metadata), 'metadata.json', [
                'Content-Type' => 'application/json; charset=UTF-8'
            ])
            ->attach('file', $fileContent, $fileName, [
                'Content-Type' => 'application/x-gzip'
            ])
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');

        if (!$multipartResponse->successful()) {
            throw new \Exception("Google Drive upload failed: " . $multipartResponse->body());
        }

        return $multipartResponse->json('id');
    }

    private function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
