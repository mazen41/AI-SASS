<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\PaymentSettingsController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\TransactionController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\SystemHealthController;
use App\Http\Controllers\Webhook\StripeWebhookController;
use App\Http\Controllers\Webhook\PaypalWebhookController;
use App\Http\Controllers\StoryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Webhook routes (no auth, signature verified internally)
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);
Route::post('/webhooks/paypal', [PaypalWebhookController::class, 'handle']);

// Protected routes — require valid Sanctum token
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);

    // Stories
    Route::get('/stories', [StoryController::class, 'index']);
    Route::post('/stories', [StoryController::class, 'store']);
    Route::get('/stories/{story}', [StoryController::class, 'show']);
    Route::put('/stories/{story}', [StoryController::class, 'update']);
    Route::delete('/stories/{story}', [StoryController::class, 'destroy']);
    Route::post('/stories/{story}/generate', [StoryController::class, 'generate']);

    // Super Admin routes
    Route::middleware('super_admin')->prefix('admin')->group(function () {
        // Dashboard & Stats
        Route::get('/stats', [DashboardController::class, 'stats']);

        // Users Management
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::post('/users/{user}/suspend', [UserController::class, 'suspend']);
        Route::post('/users/{user}/activate', [UserController::class, 'activate']);

        // Plans Management
        Route::get('/plans', [PlanController::class, 'index']);
        Route::post('/plans', [PlanController::class, 'store']);
        Route::get('/plans/{plan}', [PlanController::class, 'show']);
        Route::put('/plans/{plan}', [PlanController::class, 'update']);
        Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);

        // Payment Settings
        Route::get('/payment-settings', [PaymentSettingsController::class, 'index']);
        Route::put('/payment-settings/{gateway}', [PaymentSettingsController::class, 'update']);
        Route::post('/payment-settings/{gateway}/test', [PaymentSettingsController::class, 'testConnection']);

        // Subscriptions Management
        Route::get('/subscriptions', [SubscriptionController::class, 'index']);
        Route::get('/subscriptions/{subscription}', [SubscriptionController::class, 'show']);
        Route::post('/subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel']);
        Route::post('/subscriptions/{subscription}/reactivate', [SubscriptionController::class, 'reactivate']);

        // Transactions
        Route::get('/transactions', [TransactionController::class, 'index']);
        Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
        Route::get('/transactions-export', [TransactionController::class, 'export']);

        // Activity Logs
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
        Route::get('/activity-logs/actions', [ActivityLogController::class, 'actions']);

        // System Health
        Route::get('/system-health', [SystemHealthController::class, 'index']);
    });
});
