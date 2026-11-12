<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

App\Models\Plan::where('slug', 'free')->update(['price' => 0.00, 'yearly_price' => 0.00]);
App\Models\Plan::where('slug', 'starter')->update(['price' => 39.00, 'yearly_price' => 390.00]);
App\Models\Plan::where('slug', 'family')->update(['price' => 79.00, 'yearly_price' => 790.00]);
App\Models\Plan::where('slug', 'creator')->update(['price' => 159.00, 'yearly_price' => 1590.00]);
App\Models\Plan::where('slug', 'ultimate')->update(['price' => 319.00, 'yearly_price' => 3190.00]);

Illuminate\Support\Facades\Cache::forget('active_plans');

echo "SUCCESS_SAR_UPDATED\n";
