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
        PaymentSetting::updateOrCreate(
            ['gateway' => 'moyasar'],
            [
                'is_enabled'     => true,
                'is_sandbox'     => false,
                'public_key'     => env('MOYASAR_PUBLISHABLE_KEY', ''),
                'secret_key'     => env('MOYASAR_SECRET_KEY', ''),
                'webhook_secret' => env('MOYASAR_WEBHOOK_SECRET', ''),
                'webhook_url'    => env('APP_URL', 'http://localhost') . '/api/webhooks/moyasar',
            ]
        );

        $this->command->info('Moyasar payment gateway seeded successfully.');
    }
}
