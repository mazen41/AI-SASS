<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\JsonResponse;

class PackageController extends Controller
{
    public function index(): JsonResponse
    {
        $packages = Package::where('is_active', true)
            ->with('items.product')
            ->orderBy('total_price')
            ->get();

        return response()->json(['packages' => $packages]);
    }

    public function show(int $id): JsonResponse
    {
        $package = Package::with('items.product')->findOrFail($id);
        return response()->json(['package' => $package]);
    }
}
