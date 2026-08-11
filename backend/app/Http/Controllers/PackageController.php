<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $packages = Package::where('is_active', true)
            ->with('items.product')
            ->orderBy('total_price')
            ->get();

        return response()->json(['packages' => $this->localizePackages($packages, $this->locale($request))]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $package = Package::with('items.product')->findOrFail($id);
        return response()->json(['package' => $this->localizePackage($package, $this->locale($request))]);
    }

    private function locale(Request $request): string
    {
        $lang = strtolower((string) $request->query('lang', $request->getPreferredLanguage(['en', 'ar']) ?? 'en'));
        return str_starts_with($lang, 'ar') ? 'ar' : 'en';
    }

    private function localizePackages($packages, string $locale)
    {
        return $packages->map(fn (Package $package) => $this->localizePackage($package, $locale));
    }

    private function localizePackage(Package $package, string $locale): Package
    {
        $names = [
            'Free Trial' => ['en' => 'Free Trial', 'ar' => 'التجربة المجانية'],
            'Starter' => ['en' => 'Starter', 'ar' => 'البداية'],
            'Creator' => ['en' => 'Creator', 'ar' => 'صانع القصص'],
            'Pro Video' => ['en' => 'Pro Video', 'ar' => 'فيديو برو'],
            'Extra Video' => ['en' => 'Extra Video', 'ar' => 'فيديو إضافي'],
        ];
        $productNames = [
            'story' => ['en' => 'Story', 'ar' => 'قصة'],
            'narration' => ['en' => 'Narration', 'ar' => 'تعليق صوتي'],
            'story_book' => ['en' => 'Story Book', 'ar' => 'كتاب قصة'],
            'coloring_book' => ['en' => 'Coloring Book', 'ar' => 'كتاب تلوين'],
            'video' => ['en' => 'Video', 'ar' => 'فيديو'],
        ];

        $description = json_decode((string) $package->description, true);
        if (is_array($description)) {
            $package->description = $description[$locale] ?? $description['en'] ?? null;
        }

        $package->name = $names[$package->name][$locale] ?? $package->name;
        foreach ($package->items as $item) {
            $slug = $item->product?->slug;
            if ($slug && isset($productNames[$slug])) {
                $item->product->name = $productNames[$slug][$locale];
            }
        }

        return $package;
    }
}
