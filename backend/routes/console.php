<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;
use App\Services\BackupService;
use App\Models\BackupSetting;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('db:backup', function (BackupService $backupService) {
    $this->info('Starting database backup...');
    $result = $backupService->runBackup();
    if ($result['success']) {
        $this->info($result['message']);
    } else {
        $this->error($result['message']);
    }
})->purpose('Back up the database and upload to selected destination');

// Schedule the daily backup if enabled in the database settings
try {
    if (Schema::hasTable('backup_settings')) {
        $settings = BackupSetting::getSettings();
        if ($settings && $settings->is_enabled) {
            $time = $settings->backup_time ?: '00:00';
            Schedule::command('db:backup')->dailyAt($time);
        }
    }
} catch (\Exception $e) {
    // Avoid blocking artisan execution if database is not set up
}
