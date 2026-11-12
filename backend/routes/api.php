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
use App\Http\Controllers\Webhook\MoyasarWebhookController;
use App\Http\Controllers\Webhook\MyFatoorahWebhookController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\StorybookViewerController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\PackageController as PublicPackageController;
use App\Http\Controllers\ProductBalanceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public settings routes
Route::get('/settings/auth', [AuthSettingsController::class, 'index']);
Route::get('/settings/landing', [LandingPageSettingsController::class, 'index']);

// Public packages routes
Route::get('/packages', [PublicPackageController::class, 'index']);
Route::get('/packages/{id}', [PublicPackageController::class, 'show'])->whereNumber('id');

// Public subscription plans route for public pricing page
Route::get('/pricing/plans', [BillingController::class, 'plans']);

// Public blog routes
Route::get('/blog', [BlogPostController::class, 'index']);
Route::get('/blog/{slug}', [BlogPostController::class, 'show']);

// Public auth routes
// NOTE: the old single-step POST /register (AuthController::register) has been
// removed from routing — it allowed registering without a package and without
// verifying the email, which is exactly what tasks 4 & 5 required fixing.
// The method itself is left in AuthController for reference but is unrouted,
// so there is no way to reach it and bypass the new flow below.
Route::post('/register/initiate',    [RegistrationController::class, 'initiate']);
Route::post('/register/resend-otp',  [RegistrationController::class, 'resendOtp']);
Route::post('/register/verify-otp',  [RegistrationController::class, 'verifyOtp']);
Route::post('/register/complete',    [RegistrationController::class, 'complete']);
Route::get('/register/status/{id}',  [RegistrationController::class, 'status'])->whereUuid('id');
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

// Social auth routes
Route::get('/auth/{provider}', [SocialAuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback']);
Route::post('/auth/exchange', [SocialAuthController::class, 'exchange']);

// Webhook routes (no auth, signature verified internally)
Route::post('/webhooks/stripe',  [StripeWebhookController::class,  'handle']);
Route::post('/webhooks/paypal',  [PaypalWebhookController::class,   'handle']);
Route::post('/webhooks/moyasar', [MoyasarWebhookController::class,  'handle']);
Route::post('/webhooks/myfatoorah', [MyFatoorahWebhookController::class, 'handle']);

// Signed server-to-server callbacks from the centralized NazBiz payment service.
Route::prefix('internal/payments')->middleware('central.payment')->group(function () {
    Route::post('/verify', [\App\Http\Controllers\Api\CentralPaymentOriginController::class, 'verifyOrder']);
    Route::post('/confirm', [\App\Http\Controllers\Api\CentralPaymentOriginController::class, 'confirmPayment']);
});

// Backup download (uses api_token query param for authentication)
Route::get('/admin/backup-settings/download', [BackupSettingsController::class, 'downloadBackup']);

// Storybook Viewer (uses auth:sanctum but with JSON response on failure)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/stories/{story}/storybook', [StorybookViewerController::class, 'show'])->name('stories.storybook');
    Route::get('/stories/{story}/storybook/page/{page}', [StorybookViewerController::class, 'page'])->name('stories.storybook.page');
});

// Protected routes - require valid Sanctum token
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/account/password/force-change', [\App\Http\Controllers\AccountSecurityController::class, 'forceChangePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);

    Route::get('/support/tickets', [\App\Http\Controllers\SupportTicketController::class, 'index']);
    Route::post('/support/tickets', [\App\Http\Controllers\SupportTicketController::class, 'store']);
    Route::get('/support/tickets/{ticket}', [\App\Http\Controllers\SupportTicketController::class, 'show']);
    Route::post('/support/tickets/{ticket}/reply', [\App\Http\Controllers\SupportTicketController::class, 'reply']);

    // Stories
    Route::get('/stories', [StoryController::class, 'index']);
    Route::post('/stories', [StoryController::class, 'store']);
    Route::get('/stories/{story}/status', [StoryController::class, 'status']);
    Route::post('/stories/{story}/generate-products', [StoryController::class, 'generateProducts']);
    Route::get('/stories/{story}', [StoryController::class, 'show']);
    Route::put('/stories/{story}', [StoryController::class, 'update']);
    Route::delete('/stories/{story}', [StoryController::class, 'destroy']);
    Route::post('/stories/{story}/generate', [StoryController::class, 'generate']);
    Route::post('/stories/{story}/upload-pdf', [StoryController::class, 'uploadPdf']);

    // Billing
    Route::get('/billing/plans', [BillingController::class, 'plans']);
    Route::get('/billing/subscription', [BillingController::class, 'activeSubscription']);
    Route::post('/billing/subscribe/free', [BillingController::class, 'subscribeFree']);
    Route::post('/billing/subscribe/stripe', [BillingController::class, 'subscribeStripe']);
    Route::post('/billing/subscribe/paypal', [BillingController::class, 'subscribePaypal']);
    Route::post('/billing/subscribe/moyasar', [BillingController::class, 'subscribeMoyasar']);
    Route::post('/billing/subscribe/myfatoorah', [BillingController::class, 'subscribeMyfatoorah']);
    Route::get('/billing/myfatoorah/checkouts/{checkoutId}', [BillingController::class, 'myfatoorahCheckoutStatus'])->whereUuid('checkoutId');
    Route::post('/billing/subscription/cancel', [BillingController::class, 'cancelSubscription']);
    Route::post('/billing/upgrade', [BillingController::class, 'upgradePlan']);
    Route::post('/billing/downgrade', [BillingController::class, 'downgradePlan']);
    Route::get('/billing/addons', [BillingController::class, 'addons']);
    Route::post('/billing/addons/purchase', [BillingController::class, 'purchaseAddon']);
    Route::get('/billing/invoices', [BillingController::class, 'invoices']);
    Route::get('/billing/invoices/{id}', [BillingController::class, 'downloadInvoice']);

    // Package & Product Balances
    Route::get('/packages/balances', [ProductBalanceController::class, 'index']);
    Route::post('/packages/purchase', [ProductBalanceController::class, 'purchase']);
    Route::get('/ai-credits', [ProductBalanceController::class, 'creditSummary']);
    Route::get('/ai-credits/history', [ProductBalanceController::class, 'creditHistory']);
    Route::get('/ai-credits/packages', [ProductBalanceController::class, 'creditPackages']);
    Route::post('/ai-credits/packages/{packageId}/checkout', [ProductBalanceController::class, 'purchaseCredits'])->whereNumber('packageId');
    Route::post('/ai-credits/estimate', [StoryController::class, 'estimateCredits']);

    // Super Admin routes
    Route::middleware('super_admin')->prefix('admin')->group(function () {
        Route::get('/roles', [\App\Http\Controllers\Admin\AdminRoleController::class, 'index']);
        Route::post('/roles', [\App\Http\Controllers\Admin\AdminRoleController::class, 'store']);
        Route::put('/roles/{role}', [\App\Http\Controllers\Admin\AdminRoleController::class, 'update']);
        Route::put('/users/{user}/admin-role', [\App\Http\Controllers\Admin\AdminRoleController::class, 'assign']);
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
        Route::put('/plans/order', [PlanController::class, 'updateOrder']);
        Route::get('/plans/{plan}', [PlanController::class, 'show']);
        Route::put('/plans/{plan}', [PlanController::class, 'update']);
        Route::post('/plans/{plan}/duplicate', [PlanController::class, 'duplicate']);
        Route::post('/plans/{plan}/archive', [PlanController::class, 'archive']);
        Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);

        Route::get('/ai-credits', [\App\Http\Controllers\Admin\AiCreditsController::class, 'index']);
        Route::put('/ai-credits/pricing/{operation}', [\App\Http\Controllers\Admin\AiCreditsController::class, 'updatePricing']);
        Route::post('/ai-credits/packages', [\App\Http\Controllers\Admin\AiCreditsController::class, 'storePackage']);
        Route::put('/ai-credits/packages/{package}', [\App\Http\Controllers\Admin\AiCreditsController::class, 'updatePackage']);
        Route::post('/ai-credits/users/{user}/adjust', [\App\Http\Controllers\Admin\AiCreditsController::class, 'adjust']);

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
        Route::get('/transactions/reconciliation', [TransactionController::class, 'reconciliation']);
        Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
        Route::get('/transactions-export', [TransactionController::class, 'export']);

        Route::get('/support-tickets', [\App\Http\Controllers\Admin\SupportTicketController::class, 'index']);
        Route::get('/support-tickets/{ticket}', [\App\Http\Controllers\Admin\SupportTicketController::class, 'show']);
        Route::put('/support-tickets/{ticket}', [\App\Http\Controllers\Admin\SupportTicketController::class, 'update']);
        Route::post('/support-tickets/{ticket}/reply', [\App\Http\Controllers\Admin\SupportTicketController::class, 'reply']);
        Route::get('/generation-operations', [\App\Http\Controllers\Admin\GenerationOperationsController::class, 'index']);
        Route::get('/generation-operations/stories/{story}', [\App\Http\Controllers\Admin\GenerationOperationsController::class, 'inspect']);
        Route::post('/payment-operations/myfatoorah/invoices/{invoice}/verify', [\App\Http\Controllers\Admin\PaymentOperationsController::class, 'verifyMyFatoorah']);

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
