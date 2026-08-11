<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductAndPackageSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'Story',         'slug' => 'story',         'description' => 'AI-generated story text',         'price' => 4.00],
            ['name' => 'Narration',     'slug' => 'narration',     'description' => 'AI narration audio (ElevenLabs)', 'price' => 4.00],
            ['name' => 'Story Book',    'slug' => 'story_book',    'description' => 'Illustrated story book PDF',      'price' => 8.00],
            ['name' => 'Coloring Book', 'slug' => 'coloring_book', 'description' => 'Coloring book PDF',               'price' => 8.00],
            ['name' => 'Video',         'slug' => 'video',         'description' => 'Cinematic video generation',      'price' => 35.00],
        ];

        foreach ($products as $product) {
            DB::table('products')->updateOrInsert(
                ['slug' => $product['slug']],
                array_merge($product, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }

        $productIds = DB::table('products')
            ->whereIn('slug', ['story', 'narration', 'story_book', 'coloring_book', 'video'])
            ->pluck('id', 'slug');

        $packages = [
            [
                'name' => 'Free Trial',
                'description' => $this->localizedDescription(
                    'Try StoryHero with text and book outputs. Video is not included in the free trial.',
                    'جرّب StoryHero مع القصص والكتب فقط. الفيديو غير مشمول في التجربة المجانية.'
                ),
                'total_price' => 0.00,
                'is_active' => true,
                'items' => [
                    ['slug' => 'story', 'quantity' => 2, 'unit_price' => 0.00],
                    ['slug' => 'story_book', 'quantity' => 1, 'unit_price' => 0.00],
                ],
            ],
            [
                'name' => 'Starter',
                'description' => $this->localizedDescription(
                    'A light package for families who want stories, books, coloring pages, and one narration.',
                    'باقة خفيفة للعائلات التي تريد قصصاً وكتباً وصفحات تلوين وتعليقاً صوتياً واحداً.'
                ),
                'total_price' => 39.00,
                'is_active' => true,
                'items' => [
                    ['slug' => 'story', 'quantity' => 10, 'unit_price' => 4.00],
                    ['slug' => 'narration', 'quantity' => 1, 'unit_price' => 4.00],
                    ['slug' => 'story_book', 'quantity' => 3, 'unit_price' => 8.00],
                    ['slug' => 'coloring_book', 'quantity' => 3, 'unit_price' => 8.00],
                ],
            ],
            [
                'name' => 'Creator',
                'description' => $this->localizedDescription(
                    'Best value for regular creators. Includes two cinematic video credits.',
                    'أفضل قيمة لصنّاع القصص المنتظمين. تشمل رصيدين للفيديو السينمائي.'
                ),
                'total_price' => 119.00,
                'is_active' => true,
                'items' => [
                    ['slug' => 'story', 'quantity' => 30, 'unit_price' => 4.00],
                    ['slug' => 'narration', 'quantity' => 5, 'unit_price' => 4.00],
                    ['slug' => 'story_book', 'quantity' => 10, 'unit_price' => 8.00],
                    ['slug' => 'coloring_book', 'quantity' => 10, 'unit_price' => 8.00],
                    ['slug' => 'video', 'quantity' => 2, 'unit_price' => 35.00],
                ],
            ],
            [
                'name' => 'Pro Video',
                'description' => $this->localizedDescription(
                    'For heavy video use with enough margin for AI generation costs.',
                    'للاستخدام المكثف للفيديو مع هامش مناسب لتكاليف التوليد بالذكاء الاصطناعي.'
                ),
                'total_price' => 299.00,
                'is_active' => true,
                'items' => [
                    ['slug' => 'story', 'quantity' => 60, 'unit_price' => 4.00],
                    ['slug' => 'narration', 'quantity' => 15, 'unit_price' => 4.00],
                    ['slug' => 'story_book', 'quantity' => 20, 'unit_price' => 8.00],
                    ['slug' => 'coloring_book', 'quantity' => 20, 'unit_price' => 8.00],
                    ['slug' => 'video', 'quantity' => 8, 'unit_price' => 35.00],
                ],
            ],
            [
                'name' => 'Extra Video',
                'description' => $this->localizedDescription(
                    'One additional cinematic video credit.',
                    'رصيد إضافي واحد لإنشاء فيديو سينمائي.'
                ),
                'total_price' => 49.00,
                'is_active' => true,
                'items' => [
                    ['slug' => 'video', 'quantity' => 1, 'unit_price' => 49.00],
                ],
            ],
        ];

        DB::table('packages')
            ->whereNotIn('name', array_column($packages, 'name'))
            ->update(['is_active' => false, 'updated_at' => now()]);

        foreach ($packages as $pkg) {
            $items = $pkg['items'];
            unset($pkg['items']);

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
                if (!isset($productIds[$item['slug']])) {
                    continue;
                }

                DB::table('package_items')->insert([
                    'package_id' => $packageId,
                    'product_id' => $productIds[$item['slug']],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['quantity'] * $item['unit_price'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('Products & SAR packages seeded successfully.');
    }

    private function localizedDescription(string $en, string $ar): string
    {
        return json_encode(['en' => $en, 'ar' => $ar], JSON_UNESCAPED_UNICODE);
    }
}
