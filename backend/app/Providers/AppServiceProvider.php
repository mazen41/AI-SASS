<?php

namespace App\Providers;

use App\Services\ClaudeService;
use App\Services\Contracts\StoryTextGeneratorInterface;
use App\Services\GeminiService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Story text / storybook page generation provider.
        // Switch via AI_TEXT_PROVIDER in .env (gemini | claude), then
        // `php artisan config:clear`. Add new cases here to support more
        // providers later.
        $this->app->bind(StoryTextGeneratorInterface::class, function () {
            return match (config('services.ai.text_provider', 'gemini')) {
                'claude' => $this->app->make(ClaudeService::class),
                default  => $this->app->make(GeminiService::class),
            };
        });
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
