<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiJobLog;
use App\Models\Story;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GenerationOperationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['failed', 'started', 'completed'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = AiJobLog::query()->with('story:id,user_id,status,processing_step,created_at')
            ->select(['id', 'story_id', 'step', 'status', 'error', 'created_at', 'updated_at'])->latest();
        if (isset($filters['status'])) $query->where('status', $filters['status']);
        $jobs = $query->paginate($filters['per_page'] ?? 30)->through(fn (AiJobLog $job) => [
            'id' => $job->id, 'story_id' => $job->story_id, 'step' => $job->step,
            'status' => $job->status, 'created_at' => $job->created_at, 'updated_at' => $job->updated_at,
            // Logs may contain provider responses or customer data. Expose a short generic diagnosis only.
            'error_summary' => $job->error ? $this->safeError($job->error) : null,
            'story' => $job->story ? [
                'id' => $job->story->id, 'status' => $job->story->status,
                'processing_step' => $job->story->processing_step, 'created_at' => $job->story->created_at,
            ] : null,
        ]);
        return response()->json($jobs);
    }

    public function inspect(Story $story): JsonResponse
    {
        return response()->json([
            'story' => ['id' => $story->id, 'user_id' => $story->user_id, 'status' => $story->status,
                'processing_step' => $story->processing_step, 'selected_outputs' => $story->selected_outputs,
                'created_at' => $story->created_at, 'updated_at' => $story->updated_at],
            'outputs' => $story->outputs()->get(['output_type', 'status', 'created_at', 'updated_at']),
            'credit_reservation' => (function () use ($story) {
                $reservation = \App\Models\AiCreditReservation::with('outputs')->where('story_id', $story->id)->first();
                if (!$reservation) return null;
                return [
                    'id' => $reservation->id, 'amount' => $reservation->amount, 'status' => $reservation->status,
                    'created_at' => $reservation->created_at, 'expires_at' => $reservation->expires_at,
                    'outputs' => $reservation->outputs->map(fn ($output) => [
                        'output_type' => $output->output_type, 'amount' => $output->amount, 'status' => $output->status,
                    ])->values(),
                ];
            })(),
            'jobs' => $story->aiJobLogs()->latest()->get(['id', 'step', 'status', 'error', 'created_at', 'updated_at'])
                ->map(fn ($job) => ['id' => $job->id, 'step' => $job->step, 'status' => $job->status,
                    'error_summary' => $job->error ? $this->safeError($job->error) : null,
                    'created_at' => $job->created_at, 'updated_at' => $job->updated_at]),
        ]);
    }

    private function safeError(string $error): string
    {
        $error = strip_tags($error);
        $error = preg_replace('/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b(?:sk-|gsk_|shpss_|Bearer\s+)[A-Za-z0-9_\-]+|\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET)\s*[:=]\s*[^\s,;]+/i', '[redacted]', $error) ?? 'Generation error';
        return Str::limit($error, 220);
    }
}
