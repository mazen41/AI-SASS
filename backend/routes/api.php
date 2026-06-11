<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SocialAuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\PaymentSettingsController;
use App\Http\Controllers\Admin\StorageSettingsController;
use App\Http\Controllers\Admin\BackupSettingsController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\TransactionController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\SystemHealthController;
use App\Http\Controllers\Admin\MailController;
use App\Http\Controllers\Admin\LandingPageSettingsController;
use App\Http\Controllers\Admin\AddonController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\PackageController;
use App\Http\Controllers\Api\Admin\AuthSettingsController;
use App\Http\Controllers\Webhook\StripeWebhookController;
use App\Http\Controllers\Webhook\PaypalWebhookController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlogPostController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public settings routes
Route::get('/settings/auth', [AuthSettingsController::class, 'index']);
Route::get('/settings/landing', [LandingPageSettingsController::class, 'index']);

// Public blog routes
Route::get('/blog', [BlogPostController::class, 'index']);
Route::get('/blog/{slug}', [BlogPostController::class, 'show']);

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

// Social auth routes
Route::get('/auth/{provider}', [SocialAuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback']);

// Webhook routes (no auth, signature verified internally)
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);
Route::post('/webhooks/paypal', [PaypalWebhookController::class, 'handle']);

// Backup download (uses api_token query param for authentication)
Route::get('/admin/backup-settings/download', [BackupSettingsController::class, 'downloadBackup']);

// Protected routes - require valid Sanctum token
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);

    // Stories
    Route::get('/stories', [StoryController::class, 'index']);
    Route::post('/stories', [StoryController::class, 'store']);
    Route::get('/stories/{story}/status', [StoryController::class, 'status']);
    Route::get('/stories/{story}', [StoryController::class, 'show']);
    Route::put('/stories/{story}', [StoryController::class, 'update']);
    Route::delete('/stories/{story}', [StoryController::class, 'destroy']);
    Route::post('/stories/{story}/generate', [StoryController::class, 'generate']);

    // Billing
    Route::get('/billing/plans', [BillingController::class, 'plans']);
    Route::get('/billing/subscription', [BillingController::class, 'activeSubscription']);
    Route::post('/billing/subscribe/stripe', [BillingController::class, 'subscribeStripe']);
    Route::post('/billing/subscribe/paypal', [BillingController::class, 'subscribePaypal']);
    Route::post('/billing/subscription/cancel', [BillingController::class, 'cancelSubscription']);
    Route::post('/billing/upgrade', [BillingController::class, 'upgradePlan']);
    Route::post('/billing/downgrade', [BillingController::class, 'downgradePlan']);
    Route::get('/billing/addons', [BillingController::class, 'addons']);
    Route::post('/billing/addons/purchase', [BillingController::class, 'purchaseAddon']);
    Route::get('/billing/invoices', [BillingController::class, 'invoices']);
    Route::get('/billing/invoices/{id}', [BillingController::class, 'downloadInvoice']);

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

        // Add-Ons Management
        Route::get('/addons', [AddonController::class, 'index']);
        Route::post('/addons', [AddonController::class, 'store']);
        Route::put('/addons/{id}', [AddonController::class, 'update']);
        Route::delete('/addons/{id}', [AddonController::class, 'destroy']);

        // Products Management
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);

        // Packages Management
        Route::get('/packages', [PackageController::class, 'index']);
        Route::post('/packages', [PackageController::class, 'store']);
        Route::put('/packages/{id}', [PackageController::class, 'update']);
        Route::delete('/packages/{id}', [PackageController::class, 'destroy']);

        // Invoices Management
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/stats', [InvoiceController::class, 'stats']);
        Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
        Route::post('/invoices/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
        Route::post('/invoices/{id}/mark-refunded', [InvoiceController::class, 'markRefunded']);
        Route::post('/invoices/{id}/resend-email', [InvoiceController::class, 'resendEmail']);

        // Payment Settings
        Route::get('/payment-settings', [PaymentSettingsController::class, 'index']);
        Route::put('/payment-settings/{gateway}', [PaymentSettingsController::class, 'update']);
        Route::post('/payment-settings/{gateway}/test', [PaymentSettingsController::class, 'testConnection']);

        // Storage Settings
        Route::get('/storage-settings', [StorageSettingsController::class, 'index']);
        Route::put('/storage-settings/{driver}', [StorageSettingsController::class, 'update']);
        Route::post('/storage-settings/{driver}/test', [StorageSettingsController::class, 'testConnection']);

        // Backup Settings
        Route::get('/backup-settings', [BackupSettingsController::class, 'index']);
        Route::put('/backup-settings', [BackupSettingsController::class, 'update']);
        Route::post('/backup-settings/run', [BackupSettingsController::class, 'runBackup']);

        // Auth Settings
        Route::put('/auth-settings', [AuthSettingsController::class, 'update']);

        // Landing Page Settings
        Route::put('/landing-settings', [LandingPageSettingsController::class, 'update']);

        // Blog Management
        Route::get('/blog', [BlogPostController::class, 'adminIndex']);
        Route::post('/blog', [BlogPostController::class, 'store']);
        Route::post('/blog/upload', [BlogPostController::class, 'uploadImage']);
        Route::put('/blog/{id}', [BlogPostController::class, 'update']);
        Route::delete('/blog/{id}', [BlogPostController::class, 'destroy']);

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

        // Mail Settings & Templates
        Route::get('/mail-settings', [MailController::class, 'getSettings']);
        Route::post('/mail-settings', [MailController::class, 'saveSettings']);
        Route::post('/mail-settings/test', [MailController::class, 'testConnection']);
        Route::get('/mail-templates', [MailController::class, 'getTemplates']);
        Route::get('/mail-templates/{key}', [MailController::class, 'getTemplate']);
        Route::post('/mail-templates', [MailController::class, 'saveTemplate']);
        Route::put('/mail-templates/{id}', [MailController::class, 'saveTemplate']);
        Route::delete('/mail-templates/{id}', [MailController::class, 'deleteTemplate']);
        Route::post('/mail-templates/preview', [MailController::class, 'previewTemplate']);
        Route::post('/mail-templates/test', [MailController::class, 'testTemplate']);
        Route::post('/mail-templates/seed', [MailController::class, 'seedDefaultTemplates']);
        Route::get('/mail-logs', [MailController::class, 'getLogs']);
    });
});
