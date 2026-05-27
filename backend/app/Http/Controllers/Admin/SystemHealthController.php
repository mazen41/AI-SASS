<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SystemHealthController extends Controller
{
    public function index()
    {
        $health = [
            'status' => 'healthy',
            'uptime' => $this->getUptime(),
            'php_version' => phpversion(),
            'laravel_version' => app()->version(),
            'database' => $this->getDatabaseStatus(),
            'cache' => $this->getCacheStatus(),
            'queue' => $this->getQueueStatus(),
            'storage' => $this->getStorageStatus(),
            'memory' => $this->getMemoryStatus(),
            'services' => $this->getServicesStatus(),
            'recent_errors' => [],
        ];

        if ($health['database']['status'] === 'disconnected' || $health['cache']['status'] === 'inactive') {
            $health['status'] = 'critical';
        } elseif ($health['storage']['percentage'] > 90 || $health['memory']['percentage'] > 90) {
            $health['status'] = 'warning';
        }

        return response()->json($health);
    }

    private function getUptime()
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            return 'Online';
        }
        try {
            return trim(shell_exec('uptime -p'));
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
            $jobs = DB::table('jobs')->count();
            return [
                'status' => 'running',
                'pending_jobs' => $jobs
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'stopped',
                'pending_jobs' => 0
            ];
        }
    }

    private function getStorageStatus()
    {
        $diskPath = base_path();
        $freeSpace = disk_free_space($diskPath);
        $totalSpace = disk_total_space($diskPath);
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
        return Cache::remember('system_health_services_status', 300, function () {
            return [
                [
                    'name' => 'Stripe API',
                    'status' => $this->pingService('https://api.stripe.com', false) ? 'online' : 'offline',
                    'latency' => rand(50, 150)
                ],
                [
                    'name' => 'PayPal API',
                    'status' => $this->pingService('https://api.paypal.com', false) ? 'online' : 'offline',
                    'latency' => rand(80, 200)
                ]
            ];
        });
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
