<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Package;
use App\Models\UserPackage;
use App\Models\UserProductBalance;

class FixUserBalances extends Command
{
    protected $signature   = 'fix:user-balances {--email= : Fix a specific user by email}';
    protected $description = 'Seed products/packages if missing, then assign the free package to users with no active package';

    public function handle(): void
    {
        // ── 1. Ensure products exist ─────────────────────────────────
        $this->info('Seeding products...');
        $products = [
            ['name' => 'Story',         'slug' => 'story',         'description' => 'AI-generated story text',         'price' => 1.00],
            ['name' => 'Narration',     'slug' => 'narration',     'description' => 'AI narration audio (ElevenLabs)', 'price' => 1.50],
            ['name' => 'Story Book',    'slug' => 'story_book',    'description' => 'Illustrated story book PDF',      'price' => 2.00],
            ['name' => 'Coloring Book', 'slug' => 'coloring_book', 'description' => 'Coloring book PDF',               'price' => 2.00],
            ['name' => 'Video',         'slug' => 'video',         'description' => 'Cinematic video generation',      'price' => 3.00],
        ];
        foreach ($products as $p) {
            DB::table('products')->updateOrInsert(
                ['slug' => $p['slug']],
                array_merge($p, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }

        $productIds = DB::table('products')
            ->whereIn('slug', ['story', 'narration', 'story_book', 'coloring_book', 'video'])
            ->pluck('id', 'slug');

        // ── 2. Ensure packages exist ─────────────────────────────────
        $this->info('Seeding packages...');
        $packages = [
            [
                'name' => 'Starter Free', 'description' => 'Get started for free.', 'total_price' => 0.00, 'is_active' => true,
                'items' => [
                    ['slug' => 'story',         'quantity' => 3,  'unit_price' => 0.00],
                    ['slug' => 'narration',     'quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'story_book',    'quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'coloring_book', 'quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'video',         'quantity' => 1,  'unit_price' => 0.00],
                ],
            ],
            [
                'name' => 'Pro', 'description' => 'Great for regular storytellers.', 'total_price' => 19.99, 'is_active' => true,
                'items' => [
                    ['slug' => 'story',         'quantity' => 15, 'unit_price' => 1.00],
                    ['slug' => 'narration',     'quantity' => 10, 'unit_price' => 1.50],
                    ['slug' => 'story_book',    'quantity' => 10, 'unit_price' => 2.00],
                    ['slug' => 'coloring_book', 'quantity' => 10, 'unit_price' => 2.00],
                    ['slug' => 'video',         'quantity' => 5,  'unit_price' => 3.00],
                ],
            ],
            [
                'name' => 'Premium', 'description' => 'Unlimited creativity.', 'total_price' => 49.99, 'is_active' => true,
                'items' => [
                    ['slug' => 'story',         'quantity' => 50, 'unit_price' => 1.00],
                    ['slug' => 'narration',     'quantity' => 50, 'unit_price' => 1.50],
                    ['slug' => 'story_book',    'quantity' => 50, 'unit_price' => 2.00],
                    ['slug' => 'coloring_book', 'quantity' => 50, 'unit_price' => 2.00],
                    ['slug' => 'video',         'quantity' => 20, 'unit_price' => 3.00],
                ],
            ],
        ];

        foreach ($packages as $pkg) {
            $items = $pkg['items'];
            unset($pkg['items']);
            $existing = DB::table('packages')->where('name', $pkg['name'])->first();
            if ($existing) {
                DB::table('packages')->where('id', $existing->id)->update(array_merge($pkg, ['updated_at' => now()]));
                $packageId = $existing->id;
                DB::table('package_items')->where('package_id', $packageId)->delete();
            } else {
                $pkg['created_at'] = now();
                $pkg['updated_at'] = now();
                $packageId = DB::table('packages')->insertGetId($pkg);
            }
            foreach ($items as $item) {
                if (!isset($productIds[$item['slug']])) continue;
                DB::table('package_items')->insert([
                    'package_id' => $packageId,
                    'product_id' => $productIds[$item['slug']],
                    'quantity'   => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal'   => $item['quantity'] * $item['unit_price'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // ── 3. Find the free package ─────────────────────────────────
        $freePackage = Package::where('total_price', 0)->where('is_active', true)->with('items.product')->first();
        if (!$freePackage) {
            $this->error('No free package found after seeding. Aborting.');
            return;
        }
        $this->info("Free package: [{$freePackage->id}] {$freePackage->name}");

        // ── 4. Fix users ─────────────────────────────────────────────
        $emailFilter = $this->option('email');
        $query = User::query();
        if ($emailFilter) {
            $query->where('email', $emailFilter);
        }
        $users = $query->get();

        foreach ($users as $user) {
            $activePackage = UserPackage::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();

            if ($activePackage) {
                // Package exists — check if balances are missing
                $balanceCount = UserProductBalance::where('user_id', $user->id)->count();
                if ($balanceCount > 0) {
                    $this->line("  ✓ {$user->email} — already has package + {$balanceCount} balances, skipping.");
                    continue;
                }
                // Has package but no balances — rebuild them
                $pkgToUse = Package::with('items.product')->find($activePackage->package_id);
                $this->line("  ↻ {$user->email} — has package but missing balances, rebuilding...");
            } else {
                // No package at all — assign free package
                $this->line("  + {$user->email} — no package, assigning Starter Free...");
                $activePackage = UserPackage::create([
                    'user_id'     => $user->id,
                    'package_id'  => $freePackage->id,
                    'assigned_at' => now(),
                    'is_active'   => true,
                ]);
                $pkgToUse = $freePackage;
            }

            // Create balances from package items
            foreach ($pkgToUse->items as $item) {
                UserProductBalance::updateOrCreate(
                    ['user_id' => $user->id, 'product_id' => $item->product_id],
                    [
                        'user_package_id'  => $activePackage->id,
                        'quantity'         => $item->quantity,
                        'initial_quantity' => $item->quantity,
                        'updated_at'       => now(),
                    ]
                );
            }
            $this->info("  ✓ {$user->email} — balances set.");
        }

        $this->info('Done!');
    }
}
