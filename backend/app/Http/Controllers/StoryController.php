<?php

namespace App\Http\Controllers;

use App\Models\Story;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use App\Jobs\GenerateStoryProductsJob;
use Illuminate\Support\Facades\Storage;

class StoryController extends Controller
{
    public function index(Request $request)
    {
        $stories = $request->user()->stories()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($stories);
    }

    public function show(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'story'   => $story->load(['user', 'outputs']),
            'assets'  => $story->assets()->orderBy('scene_number')->get(),
            'outputs' => $story->outputs()->get()->keyBy('output_type'),
        ]);
    }

    /**
     * Validate that selected outputs obey mutual-exclusivity rules.
     * VIDEO is a superset (includes story + narration), so it cannot be
     * combined with story_text or narration_audio.
     *
     * Returns an error message string on violation, null if valid.
     */
    private function validateOutputCombination(array $selectedOutputs): ?string
    {
        $hasVideo = in_array('video', $selectedOutputs, true);
        $hasAudio = in_array('narration_audio', $selectedOutputs, true);
        $hasText  = in_array('story_text', $selectedOutputs, true);

        // VIDEO already includes story + narration — cannot be combined with them
        if ($hasVideo && ($hasAudio || $hasText)) {
            return 'Video Stories already include the full story and professional narration. '
                . 'You cannot combine Video with Story Text or Audio Story.';
        }

        // Only one primary mode allowed (story_text | narration_audio | video)
        $primaryModesCount = ($hasVideo ? 1 : 0) + ($hasAudio ? 1 : 0) + ($hasText ? 1 : 0);
        if ($primaryModesCount > 1) {
            return 'You can select only one of Story Text, Audio Story, or Video Story.';
        }

        return null;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'         => 'required|string|max:255',
            'theme'         => 'required|string|in:adventure,space,jungle,fantasy,ocean,dinosaur,superhero,princess,pirate',
            'child_name'    => 'nullable|string|max:100',
            'child_age'     => 'nullable|integer|min:1|max:18',
            'language'      => 'nullable|string|in:en,ar',
            'custom_prompt' => 'nullable|string|max:500',
            'photo'         => 'nullable|image|max:10240',
            'selected_outputs' => 'nullable|array',
            'selected_outputs.*' => 'string|in:story_text,narration_audio,story_book_pdf,coloring_book_pdf,video',
        ]);

        $selectedOutputs = $validated['selected_outputs'] ?? ['story_text'];

        $combinationError = $this->validateOutputCombination($selectedOutputs);
        if ($combinationError) {
            return response()->json(['message' => $combinationError], 422);
        }

        $user         = $request->user();
        $limitDetails = $user->getStoryLimitDetails();

        // Only enforce limits when the user has an active subscription;
        // users without a subscription can create stories freely.
        if ($user->activeSubscription()) {
            if (!$limitDetails['is_unlimited'] && $limitDetails['usage'] >= $limitDetails['total_limit']) {
                return response()->json(['message' => 'Monthly story limit reached.', 'limit_details' => $limitDetails], 403);
            }

            if (!$limitDetails['is_daily_unlimited'] && $limitDetails['daily_usage'] >= $limitDetails['daily_total_limit']) {
                return response()->json(['message' => 'Daily story limit reached.', 'limit_details' => $limitDetails], 403);
            }
        }

        $data = [
            'user_id'       => $user->id,
            'title'         => $validated['title'],
            'theme'         => $validated['theme'],
            'child_name'    => $validated['child_name']    ?? null,
            'child_age'     => $validated['child_age']     ?? null,
            'language'      => $validated['language']      ?? 'en',
            'custom_prompt' => $validated['custom_prompt'] ?? null,
            'status'        => 'draft',
            'selected_outputs' => $selectedOutputs,
        ];

        if ($request->hasFile('photo')) {
            $disk        = config('filesystems.default');
            $path        = $request->file('photo')->store('stories/photos', ['disk' => $disk, 'visibility' => 'public']);
            $data['photo_url'] = Storage::disk($disk)->url($path);
        }

        $story = Story::create($data);

        ActivityLog::log(userId: $user->id, action: 'story_created', entityType: 'story', entityId: $story->id, newValues: $data);

        return response()->json(['message' => 'Story created successfully', 'story' => $story], 201);
    }

    public function generate(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$story->isDraft()) {
            return response()->json(['message' => 'Story can only be generated from draft status'], 400);
        }

        $user = $request->user();
        $selectedOutputs = $story->selected_outputs ?? ['story_text'];

        // Backend guard: re-validate output combination even for stored stories
        // (protects against data inconsistency or direct API calls bypassing UI)
        $combinationError = $this->validateOutputCombination($selectedOutputs);
        if ($combinationError) {
            return response()->json(['message' => $combinationError], 422);
        }

        // Check product balances for selected outputs
        $activePackage = $user->activeUserPackage();

        // Map output types to product slugs
        $productMap = [
            'story_text'       => 'story',
            'narration_audio'  => 'narration',
            'story_book_pdf'   => 'story_book',
            'coloring_book_pdf' => 'coloring_book',
            'video'            => 'video',
        ];

        // Check if user has package and balances
        if (!$activePackage) {
            return response()->json(['message' => 'No active package. Please purchase a package to generate stories.'], 403);
        }

        $balances = $user->getAllProductBalances();
        $missingProducts = [];

        foreach ($selectedOutputs as $output) {
            $productSlug = $productMap[$output] ?? null;
            if ($productSlug) {
                $balance = $balances[$productSlug] ?? null;
                if (!$balance || $balance['quantity'] <= 0) {
                    $missingProducts[] = $output;
                }
            }
        }

        if (!empty($missingProducts)) {
            return response()->json([
                'message' => 'Insufficient product balance. Please purchase more credits.',
                'missing_outputs' => $missingProducts,
                'balances' => $balances,
            ], 403);
        }

        // Consume products
        foreach ($selectedOutputs as $output) {
            $productSlug = $productMap[$output] ?? null;
            if ($productSlug && isset($balances[$productSlug])) {
                $productId = $balances[$productSlug]['product_id'];
                $user->consumeProduct($productId, 1, $story->id, $output);
            }
        }

        $story->update(['status' => 'processing', 'processing_step' => 'queued']);

        // NOTE: Use the new dependency-based pipeline entrypoint.
        // GenerateStoryTextJob conditionally dispatches GenerateImagesJob,
        // GenerateNarrationJob, etc. based on $story->selected_outputs.
        \App\Jobs\GenerateStoryTextJob::dispatch($story);

        return response()->json(['message' => 'Story generation started', 'story' => $story->fresh()], 202);
    }

    public function status(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'status'          => $story->status,
            'processing_step' => $story->processing_step,
            'error_message'   => $story->error_message,
            'assembled_video_url' => $story->assembled_video_url,
            'narration_url'   => $story->narration_url,
            'outputs'         => $story->outputs()->get()->keyBy('output_type'),
            'assets_count'    => [
                'images' => $story->imageAssets()->count(),
                'videos' => $story->videoAssets()->count(),
                'coloring_pages' => $story->coloringPageAssets()->count(),
            ],
        ]);
    }

    public function generateProducts(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$story->content || $story->imageAssets()->count() === 0) {
            return response()->json(['message' => 'Story text and scene images are required before book products can be generated.'], 422);
        }

        GenerateStoryProductsJob::dispatchSync($story);

        return response()->json([
            'message' => 'Story products generated',
            'outputs' => $story->fresh()->outputs()->get()->keyBy('output_type'),
        ]);
    }

    public function update(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'         => 'sometimes|string|max:255',
            'child_name'    => 'sometimes|nullable|string|max:100',
            'child_age'     => 'sometimes|nullable|integer|min:1|max:18',
            'custom_prompt' => 'sometimes|nullable|string|max:500',
        ]);

        $story->update($validated);

        return response()->json(['message' => 'Story updated', 'story' => $story->fresh()]);
    }

    public function destroy(Request $request, Story $story)
    {
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($story->photo_url) {
            $disk = config('filesystems.default');
            if (preg_match('/stories\/photos\/.+$/', $story->photo_url, $matches)) {
                Storage::disk($disk)->delete($matches[0]);
            }
        }

        // Delete all story storage folder
        $disk = config('filesystems.default');
        Storage::disk($disk)->deleteDirectory("stories/{$story->id}");

        $story->delete();

        return response()->json(['message' => 'Story deleted']);
    }
}
