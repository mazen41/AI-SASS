<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductAndPackageSeeder extends Seeder
{
    public function run(): void
    {
        // ── Products ────────────────────────────────────────────────
        $products = [
            ['name' => 'Story',         'slug' => 'story',        'description' => 'AI-generated story text',         'price' => 1.00],
            ['name' => 'Narration',     'slug' => 'narration',    'description' => 'AI narration audio (ElevenLabs)', 'price' => 1.50],
            ['name' => 'Story Book',    'slug' => 'story_book',   'description' => 'Illustrated story book PDF',      'price' => 2.00],
            ['name' => 'Coloring Book', 'slug' => 'coloring_book','description' => 'Coloring book PDF',               'price' => 2.00],
            ['name' => 'Video',         'slug' => 'video',        'description' => 'Cinematic video generation',      'price' => 3.00],
        ];

        foreach ($products as $product) {
            DB::table('products')->updateOrInsert(
                ['slug' => $product['slug']],
                array_merge($product, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }

        // ── Fetch product IDs ────────────────────────────────────────
        $productIds = DB::table('products')
            ->whereIn('slug', ['story', 'narration', 'story_book', 'coloring_book', 'video'])
            ->pluck('id', 'slug');

        // ── Packages ─────────────────────────────────────────────────
        $packages = [
            [
                'name'        => 'Starter Free',
                'description' => 'Get started for free. Perfect for trying out StoryHero.',
                'total_price' => 0.00,
                'is_active'   => true,
                'items' => [
                    ['slug' => 'story',        'quantity' => 3,  'unit_price' => 0.00],
                    ['slug' => 'narration',    'quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'story_book',   'quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'coloring_book','quantity' => 1,  'unit_price' => 0.00],
                    ['slug' => 'video',        'quantity' => 1,  'unit_price' => 0.00],
                ],
            ],
            [
                'name'        => 'Pro',
                'description' => 'Great for regular storytellers. Includes 15 stories and full media output.',
                'total_price' => 19.99,
                'is_active'   => true,
                'items' => [
                    ['slug' => 'story',        'quantity' => 15, 'unit_price' => 1.00],
                    ['slug' => 'narration',    'quantity' => 10, 'unit_price' => 1.50],
                    ['slug' => 'story_book',   'quantity' => 10, 'unit_price' => 2.00],
                    ['slug' => 'coloring_book','quantity' => 10, 'unit_price' => 2.00],
                    ['slug' => 'video',        'quantity' => 5,  'unit_price' => 3.00],
                ],
            ],
            [
                'name'        => 'Premium',
                'description' => 'Unlimited creativity. 50 stories, full video & coloring book access.',
                'total_price' => 49.99,
                'is_active'   => true,
                'items' => [
                    ['slug' => 'story',        'quantity' => 50, 'unit_price' => 1.00],
                    ['slug' => 'narration',    'quantity' => 50, 'unit_price' => 1.50],
                    ['slug' => 'story_book',   'quantity' => 50, 'unit_price' => 2.00],
                    ['slug' => 'coloring_book','quantity' => 50, 'unit_price' => 2.00],
                    ['slug' => 'video',        'quantity' => 20, 'unit_price' => 3.00],
                ],
            ],
        ];

        foreach ($packages as $pkg) {
            $items = $pkg['items'];
            unset($pkg['items']);

            // Calculate total_price from items
            $pkg['created_at'] = now();
            $pkg['updated_at'] = now();

            $existing = DB::table('packages')->where('name', $pkg['name'])->first();
            if ($existing) {
                DB::table('packages')->where('id', $existing->id)->update(array_merge($pkg, ['updated_at' => now()]));
                $packageId = $existing->id;
                DB::table('package_items')->where('package_id', $packageId)->delete();
            } else {
                $packageId = DB::table('packages')->insertGetId($pkg);
            }

            foreach ($items as $item) {
                if (!isset($productIds[$item['slug']])) continue;
                $productId = $productIds[$item['slug']];
                DB::table('package_items')->insert([
                    'package_id'  => $packageId,
                    'product_id'  => $productId,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'subtotal'    => $item['quantity'] * $item['unit_price'],
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }

        $this->command->info('Products & Packages seeded successfully.');
    }
}
