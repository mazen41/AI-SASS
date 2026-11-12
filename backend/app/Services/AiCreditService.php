<?php

namespace App\Services;

use App\Models\AiCreditPackage;
use App\Models\AiCreditReservation;
use App\Models\AiCreditReservationOutput;
use App\Models\AiCreditTransaction;
use App\Models\AiCreditWallet;
use App\Models\AiGenerationPricing;
use App\Models\Plan;
use App\Models\Story;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AiCreditService
{
    public function wallet(User $user): AiCreditWallet
    {
        return AiCreditWallet::firstOrCreate(['user_id' => $user->id]);
    }

    public function estimate(User $user, array $outputs, array $settings = []): array
    {
        $pageCount = (int) ($settings['page_count'] ?? 8);
        $hasBookOutput = (bool) array_intersect($outputs, ['story_book_pdf', 'coloring_book_pdf']);
        $configuredScenes = (int) ($settings['scene_count'] ?? 0);
        $sceneCount = $configuredScenes > 0 ? $configuredScenes : ($hasBookOutput ? $pageCount : 12);
        $lines = [];
        foreach (array_unique($outputs) as $output) {
            $amount = match ($output) {
                'story_text' => $this->price('story_text', 1),
                'narration_audio' => $this->price('narration_audio', max(1, (int) ceil(((int)($settings['duration_seconds'] ?? 60)) / 60))),
                'story_book_pdf' => $this->price('storybook_page', $pageCount),
                'coloring_book_pdf' => $this->price('coloring_page', $pageCount),
                'video' => $this->price('video_scene', $sceneCount),
                default => throw new RuntimeException('Unsupported AI generation output.'),
            };
            $lines[$output] = $amount;
        }
        $wallet = $this->wallet($user);
        $total = array_sum($lines);
        return [
            'outputs' => $lines,
            'total_credits' => $total,
            'wallet' => [
                'subscription_credits' => (int) $wallet->subscription_credits,
                'purchased_credits' => (int) $wallet->purchased_credits,
                'reserved_credits' => (int) $wallet->reserved_credits,
                'available_credits' => $wallet->available,
                'remaining_after_generation' => max(0, $wallet->available - $total),
            ],
            'sufficient' => $wallet->available >= $total,
            'shortfall' => max(0, $total - $wallet->available),
            'pricing_version' => AiGenerationPricing::max('version') ?: 1,
        ];
    }

    public function reserve(User $user, Story $story, array $outputs, array $settings = []): AiCreditReservation
    {
        return DB::transaction(function () use ($user, $story, $outputs, $settings) {
            $wallet = AiCreditWallet::firstOrCreate(['user_id' => $user->id]);
            $wallet = AiCreditWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            $estimate = $this->estimate($user, $outputs, $settings);
            $total = $estimate['total_credits'];
            if ($wallet->available < $total) {
                throw new RuntimeException('Insufficient AI credits. You need ' . $estimate['shortfall'] . ' more credits.');
            }
            $existing = AiCreditReservation::where('story_id', $story->id)->lockForUpdate()->first();
            if ($existing) {
                if ($existing->status === 'reserved') return $existing->load('outputs');
                throw new RuntimeException('Credits have already been processed for this generation.');
            }

            $subRemaining = min((int)$wallet->subscription_credits, $total);
            $purchasedRemaining = $total - $subRemaining;
            $reservation = AiCreditReservation::create([
                'user_id' => $user->id, 'story_id' => $story->id, 'amount' => $total,
                'subscription_amount' => $subRemaining, 'purchased_amount' => $purchasedRemaining,
                'status' => 'reserved', 'expires_at' => now()->addHours(24),
                'subscription_cycle_started_at' => $wallet->cycle_started_at,
            ]);
            foreach ($estimate['outputs'] as $type => $amount) {
                $subPart = min($subRemaining, $amount);
                $subRemaining -= $subPart;
                $purchasedPart = $amount - $subPart;
                $reservation->outputs()->create([
                    'output_type' => $type, 'amount' => $amount,
                    'subscription_amount' => $subPart, 'purchased_amount' => $purchasedPart,
                ]);
                if ($amount > 0) {
                    AiCreditTransaction::create([
                        'user_id' => $user->id, 'story_id' => $story->id, 'reservation_id' => $reservation->id,
                        'type' => 'reserved', 'bucket' => 'mixed', 'amount' => -$amount,
                        'status' => 'reserved', 'reference' => "reservation:{$reservation->id}:{$type}:reserved",
                        'description' => ucfirst(str_replace('_', ' ', $type)) . ' generation reservation',
                        'metadata' => ['pricing_version' => $estimate['pricing_version'], 'settings' => $settings],
                    ]);
                }
            }
            $wallet->subscription_credits -= $reservation->subscription_amount;
            $wallet->purchased_credits -= $reservation->purchased_amount;
            $wallet->reserved_credits += $total;
            $wallet->save();
            return $reservation->load('outputs');
        });
    }

    public function finalizeOutput(Story $story, string $outputType): void
    {
        DB::transaction(function () use ($story, $outputType) {
            $reservation = AiCreditReservation::where('story_id', $story->id)->where('status', 'reserved')->latest('id')->lockForUpdate()->first();
            $output = $reservation?->outputs()->where('output_type', $outputType)->lockForUpdate()->first();
            if (!$reservation || !$output || $output->status !== 'reserved') return;
            $wallet = AiCreditWallet::where('user_id', $reservation->user_id)->lockForUpdate()->firstOrFail();
            $wallet->reserved_credits = max(0, $wallet->reserved_credits - $output->amount);
            $wallet->consumed_this_cycle += $output->amount;
            $wallet->save();
            $output->update(['status' => 'consumed']);
            AiCreditTransaction::where('reference', "reservation:{$reservation->id}:{$outputType}:reserved")->update(['status' => 'completed']);
            AiCreditTransaction::firstOrCreate(['reference' => "reservation:{$reservation->id}:{$outputType}:consumed"], [
                'user_id' => $reservation->user_id, 'story_id' => $story->id, 'reservation_id' => $reservation->id,
                'type' => 'consumed', 'bucket' => 'mixed', 'amount' => -$output->amount, 'status' => 'completed',
                'description' => ucfirst(str_replace('_', ' ', $outputType)) . ' generation',
                'metadata' => ['subscription_credits' => $output->subscription_amount, 'purchased_credits' => $output->purchased_amount],
            ]);
            $this->refreshReservationStatus($reservation);
        });
    }

    public function refundOutput(Story $story, string $outputType, string $reason = 'Generation failed'): bool
    {
        return DB::transaction(function () use ($story, $outputType, $reason) {
            $reservation = AiCreditReservation::where('story_id', $story->id)->where('status', 'reserved')->latest('id')->lockForUpdate()->first();
            $output = $reservation?->outputs()->where('output_type', $outputType)->lockForUpdate()->first();
            if (!$reservation || !$output || $output->status !== 'reserved') return false;
            $wallet = AiCreditWallet::where('user_id', $reservation->user_id)->lockForUpdate()->firstOrFail();
            $wallet->reserved_credits = max(0, $wallet->reserved_credits - $output->amount);
            $sameSubscriptionCycle = $reservation->subscription_cycle_started_at?->equalTo($wallet->cycle_started_at)
                ?? ($wallet->cycle_started_at === null);
            if ($sameSubscriptionCycle) $wallet->subscription_credits += $output->subscription_amount;
            else $wallet->purchased_credits += $output->subscription_amount;
            $wallet->purchased_credits += $output->purchased_amount;
            $wallet->save();
            $output->update(['status' => 'refunded']);
            AiCreditTransaction::where('reference', "reservation:{$reservation->id}:{$outputType}:reserved")->update(['status' => 'refunded']);
            AiCreditTransaction::firstOrCreate(['reference' => "reservation:{$reservation->id}:{$outputType}:refund"], [
                'user_id' => $reservation->user_id, 'story_id' => $story->id, 'reservation_id' => $reservation->id,
                'type' => 'refund', 'bucket' => 'mixed', 'amount' => $output->amount, 'status' => 'completed',
                'description' => $reason, 'metadata' => [
                    'subscription_credits' => $sameSubscriptionCycle ? $output->subscription_amount : 0,
                    'purchased_credits' => $output->purchased_amount + ($sameSubscriptionCycle ? 0 : $output->subscription_amount),
                    'subscription_cycle_changed' => !$sameSubscriptionCycle,
                ],
            ]);
            $this->refreshReservationStatus($reservation);
            return true;
        });
    }

    public function grant(User $user, int $credits, string $type, string $reference, string $bucket = 'purchased', array $metadata = []): bool
    {
        if ($credits < 0) throw new RuntimeException('Credit grants cannot be negative.');
        if (trim($reference) === '') throw new RuntimeException('Credit grants require an idempotency reference.');

        return DB::transaction(function () use ($user, $credits, $type, $reference, $bucket, $metadata) {
            $wallet = AiCreditWallet::firstOrCreate(['user_id' => $user->id]);
            $wallet = AiCreditWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            // The ledger's unique reference arbitrates webhook retries. Insert
            // it before mutating the balance, inside the same transaction.
            $created = DB::table('ai_credit_transactions')->insertOrIgnore([
                'user_id' => $user->id, 'type' => $type, 'bucket' => $bucket, 'amount' => $credits,
                'status' => 'completed', 'reference' => $reference,
                'description' => str_replace('_', ' ', ucfirst($type)), 'metadata' => json_encode($metadata),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            if (!$created) return false;
            // Monthly allowances roll over in this release. Renewal adds the
            // new allowance and never changes purchased credits.
            if ($bucket === 'subscription') $wallet->subscription_credits += $credits;
            else $wallet->purchased_credits += $credits;
            if ($bucket === 'subscription') {
                $wallet->cycle_started_at = now();
                $wallet->consumed_this_cycle = 0;
            }
            $wallet->save();
            return true;
        });
    }

    public function grantPlanCredits(User $user, Plan $plan, string $reference): bool
    {
        return $this->grant($user, (int)$plan->monthly_credits, 'subscription_renewal', $reference, 'subscription', ['plan_id' => $plan->id]);
    }

    public function adjust(User $user, int $amount, string $reason, User $actor): void
    {
        if ($amount === 0) throw new RuntimeException('Adjustment must be non-zero.');
        DB::transaction(function () use ($user, $amount, $reason, $actor) {
            $wallet = AiCreditWallet::firstOrCreate(['user_id' => $user->id]);
            $wallet = AiCreditWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            if ($amount < 0 && $wallet->available < abs($amount)) throw new RuntimeException('Adjustment would make available credits negative.');
            if ($amount > 0) $wallet->purchased_credits += $amount;
            else {
                $deduction = abs($amount);
                $fromSub = min($wallet->subscription_credits, $deduction);
                $wallet->subscription_credits -= $fromSub;
                $wallet->purchased_credits -= $deduction - $fromSub;
            }
            $wallet->save();
            AiCreditTransaction::create([
                'user_id' => $user->id, 'actor_id' => $actor->id, 'type' => 'admin_adjustment', 'bucket' => 'mixed',
                'amount' => $amount, 'status' => 'completed', 'reference' => 'admin-adjustment:' . Str::uuid(),
                'description' => $reason, 'metadata' => ['actor_email' => $actor->email],
            ]);
        });
    }

    public function summarize(User $user): array
    {
        $wallet = $this->wallet($user);
        return [
            'available_credits' => $wallet->available,
            'subscription_credits' => (int)$wallet->subscription_credits,
            'purchased_credits' => (int)$wallet->purchased_credits,
            'reserved_credits' => (int)$wallet->reserved_credits,
            'consumed_this_cycle' => (int)$wallet->consumed_this_cycle,
            'cycle_started_at' => $wallet->cycle_started_at,
            'renewal_at' => $user->activeSubscription()?->current_period_end,
        ];
    }

    private function price(string $operation, int $units): int
    {
        $rule = AiGenerationPricing::where('operation', $operation)->where('is_enabled', true)->first();
        if (!$rule) throw new RuntimeException("Generation pricing is unavailable for {$operation}.");
        return (int)$rule->base_credits + (int)$rule->per_unit_credits * max(0, $units);
    }

    public function expireReservations(): int
    {
        $expired = 0;
        AiCreditReservation::where('status', 'reserved')->where('expires_at', '<=', now())
            ->orderBy('id')->chunkById(100, function ($reservations) use (&$expired) {
                foreach ($reservations as $reservation) {
                    $story = Story::find($reservation->story_id);
                    // Never expire a live job. A long-running generation must
                    // not finish after its credits have been released.
                    if (!$story || $story->status === 'processing') continue;
                    foreach ($reservation->outputs()->where('status', 'reserved')->get() as $output) {
                        if ($this->refundOutput($story, $output->output_type, 'Generation reservation expired')) $expired++;
                    }
                }
            });
        return $expired;
    }

    private function refreshReservationStatus(AiCreditReservation $reservation): void
    {
        $reservation->refresh();
        $statuses = $reservation->outputs()->pluck('status')->unique();
        if ($statuses->contains('reserved')) return;
        $allRefunded = $statuses->isNotEmpty() && $statuses->every(fn ($status) => $status === 'refunded');
        $reservation->update([
            'status' => $allRefunded ? 'refunded' : ($statuses->contains('refunded') ? 'partially_refunded' : 'completed'),
        ]);
    }
}
