<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('storage_settings')) {
                $setting = \App\Models\StorageSetting::getActive();
                if ($setting) {
                    $setting->applyConfiguration();
                }
            }
        } catch (\Exception $e) {
            // Avoid failing during migrations or database connection issues
        }
    }
}
