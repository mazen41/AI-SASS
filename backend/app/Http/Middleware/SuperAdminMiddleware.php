<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        if (!$request->user()->isActive()) {
            return response()->json([
                'message' => 'Your account has been suspended.',
            ], 403);
        }

        if ($request->user()->must_change_password) {
            return response()->json([
                'message' => 'Change your temporary password before using admin features.',
                'error_code' => 'PASSWORD_CHANGE_REQUIRED',
            ], 428);
        }

        // Super-admin is the platform owner and retains full access. Other admins
        // are authorized per operation; unknown routes fail closed.
        if (!$request->user()->isSuperAdmin()) {
            $permission = $this->permissionFor($request);
            if (!$permission || !$request->user()->hasAdminPermission($permission)) {
                return response()->json([
                    'message' => 'You do not have permission to perform this admin action.',
                    'error_code' => 'ADMIN_PERMISSION_REQUIRED',
                    'required_permission' => $permission,
                ], 403);
            }
        }

        return $next($request);
    }

    private function permissionFor(Request $request): ?string
    {
        $parts = explode('/', trim($request->path(), '/'));
        $resource = $parts[2] ?? '';
        $method = $request->method();
        $tail = implode('/', array_slice($parts, 3));

        if ($resource === 'users' && str_ends_with($tail, 'admin-role')) {
            return 'roles.manage';
        }

        return match ($resource) {
            'stats' => 'dashboard.view',
            'users' => $method === 'GET' ? 'users.view' : 'users.manage',
            'plans' => $method === 'GET' && $tail !== 'order' ? 'plans.view' : 'plans.manage',
            'ai-credits' => match (true) {
                $method === 'GET' => 'credits.view',
                str_starts_with($tail, 'pricing/') => 'credits.pricing',
                str_starts_with($tail, 'packages') => 'credit_packages.manage',
                str_starts_with($tail, 'users/') => 'credits.adjust',
                default => null,
            },
            'addons' => $method === 'GET' ? 'addons.manage' : 'addons.manage',
            'products' => 'products.manage',
            'packages' => 'packages.manage',
            'invoices' => $method === 'GET' ? 'invoices.view' : 'invoices.manage',
            'payment-settings' => $method === 'GET' ? 'payments.manage' : 'payments.manage',
            'storage-settings' => 'storage.manage',
            'backup-settings' => 'backups.manage',
            'auth-settings' => 'auth.manage',
            'landing-settings', 'blog' => 'cms.manage',
            'subscriptions' => $method === 'GET' ? 'subscriptions.view' : 'subscriptions.manage',
            'transactions', 'transactions-export' => 'transactions.view',
            'support-tickets' => in_array($method, ['GET', 'HEAD']) ? 'support.view' : 'support.manage',
            'generation-operations' => 'generation.support',
            'payment-operations' => 'payments.audit',
            'activity-logs' => 'audit.view',
            'system-health' => 'system.view',
            'mail-settings', 'mail-templates' => in_array($method, ['GET', 'HEAD']) ? 'mail.view' : 'mail.manage',
            'mail-logs' => 'mail.view',
            'roles' => $method === 'GET' ? 'roles.view' : 'roles.manage',
            default => null,
        };
    }
}
