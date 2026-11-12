<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;

class SystemHealthController extends Controller
{
    public function index()
    {
        $health = [
            'status' => 'unknown',
            'uptime' => $this->getUptime(),
            'php_version' => phpversion(),
            'laravel_version' => app()->version(),
            'database' => $this->getDatabaseStatus(),
            'cache' => $this->getCacheStatus(),
            'queue' => $this->getQueueStatus(),
            'storage' => $this->getStorageStatus(),
            'memory' => $this->getMemoryStatus(),
            'services' => $this->getServicesStatus(),
            'recent_errors' => $this->getRecentErrors(),
        ];

        if ($health['database']['status'] === 'disconnected' || $health['cache']['status'] === 'inactive' || $health['queue']['backend_status'] === 'disconnected') {
            $health['status'] = 'critical';
        } elseif ($health['storage']['percentage'] > 90 || $health['memory']['percentage'] > 90 || collect($health['services'])->contains(fn ($service) => $service['status'] === 'offline')) {
            $health['status'] = 'warning';
        } elseif ($health['database']['status'] === 'connected' && $health['cache']['status'] === 'active' && $health['queue']['backend_status'] === 'connected') {
            $health['status'] = 'healthy';
        }

        return response()->json($health);
    }

    private function getUptime()
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            return 'Online';
        }
        try {
            $uptime = shell_exec('uptime -p');
            return is_string($uptime) && trim($uptime) !== '' ? trim($uptime) : 'Unknown';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    private function getDatabaseStatus()
    {
        try {
            DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
            $sizeResult = DB::select("SELECT SUM(data_length + index_length) / 1024 / 1024 AS size FROM information_schema.tables WHERE table_schema = ?", [$dbName]);
            $sizeMb = round($sizeResult[0]->size ?? 0, 2);

            return [
                'status' => 'connected',
                'type' => 'MySQL',
                'size' => $sizeMb . ' MB'
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'disconnected',
                'type' => 'Unknown',
                'size' => '0 MB'
            ];
        }
    }

    private function getCacheStatus()
    {
        try {
            Cache::put('health_check', true, 10);
            $active = Cache::get('health_check') === true;
            return [
                'status' => $active ? 'active' : 'inactive',
                'driver' => config('cache.default')
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'inactive',
                'driver' => config('cache.default')
            ];
        }
    }

    private function getQueueStatus()
    {
        try {
            $queue = Queue::connection();
            $pendingJobs = $queue->size();
            $failedJobs = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null;
            return [
                // Queue connectivity does not prove a worker process is alive.
                'status' => 'unknown',
                'backend_status' => 'connected',
                'worker_status' => 'not_observable',
                'connection' => config('queue.default'),
                'pending_jobs' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'stopped',
                'backend_status' => 'disconnected',
                'worker_status' => 'unknown',
                'connection' => config('queue.default'),
                'pending_jobs' => null,
                // The database may be the reason the queue check failed; avoid querying it again here.
                'failed_jobs' => null,
            ];
        }
    }

    private function getStorageStatus()
    {
        $diskPath = base_path();
        $freeSpace = @disk_free_space($diskPath);
        $totalSpace = @disk_total_space($diskPath);
        if (!is_numeric($freeSpace) || !is_numeric($totalSpace) || $totalSpace <= 0) {
            return ['used' => 'Unknown', 'total' => 'Unknown', 'percentage' => 0];
        }
        $usedSpace = $totalSpace - $freeSpace;
        $percentage = $totalSpace > 0 ? round(($usedSpace / $totalSpace) * 100) : 0;

        return [
            'used' => $this->formatBytes($usedSpace),
            'total' => $this->formatBytes($totalSpace),
            'percentage' => $percentage
        ];
    }

    private function getMemoryStatus()
    {
        $memoryLimitStr = ini_get('memory_limit');
        $memoryLimit = 128 * 1024 * 1024;

        if (preg_match('/^(\d+)(.)$/', $memoryLimitStr, $matches)) {
            if ($matches[2] == 'M') $memoryLimit = $matches[1] * 1024 * 1024;
            elseif ($matches[2] == 'K') $memoryLimit = $matches[1] * 1024;
            elseif ($matches[2] == 'G') $memoryLimit = $matches[1] * 1024 * 1024 * 1024;
        }

        $memoryUsage = memory_get_usage(true);
        $percentage = $memoryLimit > 0 ? round(($memoryUsage / $memoryLimit) * 100) : 0;

        return [
            'used' => $this->formatBytes($memoryUsage),
            'limit' => $this->formatBytes($memoryLimit),
            'percentage' => $percentage
        ];
    }

    private function getServicesStatus()
    {
        try {
            return Cache::remember('system_health_services_status', 60, function () {
            $services = [
                ['name' => 'OpenAI', 'key' => config('services.openai.key'), 'url' => 'https://api.openai.com/v1/models'],
                ['name' => 'Anthropic', 'key' => config('services.claude.key'), 'url' => 'https://api.anthropic.com/v1/models'],
                ['name' => 'Google Gemini', 'key' => config('services.gemini.key'), 'url' => 'https://generativelanguage.googleapis.com'],
                ['name' => 'Fal.ai', 'key' => config('services.fal.key'), 'url' => 'https://queue.fal.run'],
                ['name' => 'ElevenLabs', 'key' => config('services.elevenlabs.key'), 'url' => 'https://api.elevenlabs.io'],
            ];

            if (Schema::hasTable('payment_settings')) {
                foreach (DB::table('payment_settings')->where('is_enabled', true)->get(['gateway', 'is_sandbox']) as $gateway) {
                    $url = match ($gateway->gateway) {
                        'stripe' => 'https://api.stripe.com',
                        'paypal' => $gateway->is_sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com',
                        'myfatoorah' => 'https://api.myfatoorah.com',
                        'moyasar' => 'https://api.moyasar.com',
                        default => null,
                    };
                    if ($url) $services[] = ['name' => ucfirst($gateway->gateway), 'key' => 'configured', 'url' => $url];
                }
            }

            return collect($services)->map(function (array $service): array {
                if (empty($service['key'])) {
                    return ['name' => $service['name'], 'status' => 'unconfigured', 'latency' => null];
                }
                $startedAt = microtime(true);
                $online = $this->pingService($service['url'], false);
                return [
                    'name' => $service['name'],
                    'status' => $online ? 'online' : 'offline',
                    'latency' => $online ? (int) round((microtime(true) - $startedAt) * 1000) : null,
                ];
            })->values()->all();
            });
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function getRecentErrors(): array
    {
        try {
            if (!Schema::hasTable('failed_jobs')) return [];
            return DB::table('failed_jobs')->latest('failed_at')->limit(10)->get(['id', 'exception', 'failed_at'])
                ->map(function ($job): array {
                    $firstLine = strtok((string) $job->exception, "\r\n") ?: '';
                    preg_match('/([A-Za-z0-9_\\\\]+(?:Exception|Error))/', $firstLine, $matches);
                    return [
                        'id' => $job->id,
                        // Expose the exception class, not its message/trace, which may contain credentials or user data.
                        'message' => isset($matches[1]) ? class_basename($matches[1]) : 'Background job failed',
                        'timestamp' => $job->failed_at,
                    ];
                })->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    private function pingService($url, $expectSuccess = true)
    {
        try {
            $response = Http::timeout(3)->get($url);
            return $expectSuccess ? $response->successful() : true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
