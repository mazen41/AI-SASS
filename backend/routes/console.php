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

Artisan::command('subscription:remind-renewals', function () {
    $this->info('Checking for renewing subscriptions...');
    // Find active subscriptions expiring in exactly 3 days
    $subscriptions = \App\Models\Subscription::where('status', 'active')
        ->whereNotNull('current_period_end')
        ->whereDate('current_period_end', now()->addDays(3)->toDateString())
        ->get();

    foreach ($subscriptions as $sub) {
        $user = $sub->user;
        if ($user) {
            $this->info("Sending renewal reminder to: {$user->email}");
            try {
                \App\Services\MailService::sendWithTemplate('subscription_renewal_reminder', $user->email, [
                    'app_name' => config('app.name', 'StoryHero'),
                    'user_name' => $user->name,
                    'plan_name' => $sub->plan->name ?? 'Premium',
                    'days_remaining' => 3,
                    'renewal_date' => $sub->current_period_end->toDateString(),
                    'amount' => '$' . number_format($sub->plan->price ?? 0.0, 2),
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Failed to send renewal reminder to {$user->email}: " . $e->getMessage());
            }
        }
    }
    $this->info('Done.');
})->purpose('Send subscription renewal reminders 3 days before renewal');

Artisan::command('ai-credits:expire-reservations', function (\App\Services\AiCreditService $credits) {
    $count = $credits->expireReservations();
    $this->info("Expired and refunded {$count} pending AI credit output reservation(s).");
})->purpose('Refund AI generation credit reservations that exceeded their safe processing window');

// Schedule the daily backup if enabled in the database settings
try {
    if (Schema::hasTable('backup_settings')) {
        $settings = BackupSetting::getSettings();
        if ($settings && $settings->is_enabled) {
            $time = $settings->backup_time ?: '00:00';
            Schedule::command('db:backup')->dailyAt($time);
        }
    }
    Schedule::command('subscription:remind-renewals')->dailyAt('09:00');
Schedule::command('ai-credits:expire-reservations')->everyFifteenMinutes();
} catch (\Exception $e) {
    // Avoid blocking artisan execution if database is not set up
}
