<?php

namespace Database\Seeders;

use App\Models\PaymentSetting;
use Illuminate\Database\Seeder;

/**
 * Seeds the Moyasar payment gateway row into payment_settings.
 * Run once: php artisan db:seed --class=MoyasarPaymentSeeder
 *
 * Keys are read from .env so nothing is hardcoded here.
 * After seeding, keys can also be updated via the admin panel:
 *   PUT /api/admin/payment-settings/moyasar
 */
class MoyasarPaymentSeeder extends Seeder
{
    public function run(): void
    {
        $publicKey = trim((string) env('MOYASAR_PUBLISHABLE_KEY', ''));
        $secretKey = trim((string) env('MOYASAR_SECRET_KEY', ''));
        $webhookSecret = trim((string) env('MOYASAR_WEBHOOK_SECRET', ''));

        if ($publicKey === '' || $secretKey === '' || $webhookSecret === '') {
            throw new \RuntimeException(
                'Moyasar is not fully configured. Set MOYASAR_PUBLISHABLE_KEY, MOYASAR_SECRET_KEY, and MOYASAR_WEBHOOK_SECRET before seeding.'
            );
        }

        PaymentSetting::updateOrCreate(
            ['gateway' => 'moyasar'],
            [
                'is_enabled'     => true,
                'is_sandbox'     => false,
                'public_key'     => $publicKey,
                'secret_key'     => $secretKey,
                'webhook_secret' => $webhookSecret,
                'webhook_url'    => env('APP_URL', 'http://localhost') . '/api/webhooks/moyasar',
            ]
        );

        $this->command->info('Moyasar payment gateway seeded successfully.');
    }
}
