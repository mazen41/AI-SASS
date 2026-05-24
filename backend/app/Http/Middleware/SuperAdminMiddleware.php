<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isSuperAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Super admin access required.',
            ], 403);
        }

        if (!$request->user()->isActive()) {
            return response()->json([
                'message' => 'Your account has been suspended.',
            ], 403);
        }

        return $next($request);
    }
}
