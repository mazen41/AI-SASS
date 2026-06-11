<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index()
    {
        return response()->json(['packages' => Package::with('items.product')->orderBy('created_at', 'desc')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
            'items'       => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        $total = 0;
        $itemsData = [];
        foreach ($data['items'] as $item) {
            $product = Product::findOrFail($item['product_id']);
            $subtotal = $product->price * $item['quantity'];
            $total += $subtotal;
            $itemsData[] = [
                'product_id' => $product->id,
                'quantity'   => $item['quantity'],
                'unit_price' => $product->price,
                'subtotal'   => $subtotal,
            ];
        }

        $package = Package::create([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'total_price' => $total,
        ]);

        foreach ($itemsData as $item) {
            $package->items()->create($item);
        }

        return response()->json(['package' => $package->load('items.product')], 201);
    }

    public function update(Request $request, $id)
    {
        $package = Package::findOrFail($id);
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
            'items'       => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        $total = 0;
        $itemsData = [];
        foreach ($data['items'] as $item) {
            $product = Product::findOrFail($item['product_id']);
            $subtotal = $product->price * $item['quantity'];
            $total += $subtotal;
            $itemsData[] = [
                'product_id' => $product->id,
                'quantity'   => $item['quantity'],
                'unit_price' => $product->price,
                'subtotal'   => $subtotal,
            ];
        }

        $package->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'total_price' => $total,
        ]);

        $package->items()->delete();
        foreach ($itemsData as $item) {
            $package->items()->create($item);
        }

        return response()->json(['package' => $package->load('items.product')]);
    }

    public function destroy($id)
    {
        Package::findOrFail($id)->delete();
        return response()->json(['message' => 'Package deleted']);
    }
}
