<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\UserProductBalance;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductBalanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $activePackage = $user->activeUserPackage();
        $balances = $user->getAllProductBalances();

        return response()->json([
            'active_package' => $activePackage?->load('package.items.product'),
            'balances' => $balances,
        ]);
    }

    public function purchase(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $product = Product::findOrFail($request->product_id);
        $quantity = $request->quantity;

        $totalAmount = $product->price * $quantity;

        // Create invoice for product purchase
        $invoice = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'amount' => $totalAmount,
            'currency' => 'USD',
            'status' => 'paid',
            'items' => [
                [
                    'name' => $product->name,
                    'price' => $product->price,
                    'quantity' => $quantity,
                    'type' => 'product',
                    'slug' => $product->slug,
                ]
            ],
            'gateway' => 'mock',
            'issued_at' => now(),
            'paid_at' => now(),
        ]);

        // Add balance to user
        $balance = UserProductBalance::where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->first();

        if ($balance) {
            $balance->addBalance($quantity);
        } else {
            UserProductBalance::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'quantity' => $quantity,
                'initial_quantity' => $quantity,
            ]);
        }

        return response()->json([
            'message' => 'Product purchased successfully',
            'invoice' => $invoice,
            'new_balance' => $user->getProductBalance($product->id),
        ]);
    }
}
