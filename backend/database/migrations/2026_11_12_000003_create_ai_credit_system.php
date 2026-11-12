<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'monthly_credits')) $table->unsignedInteger('monthly_credits')->default(0);
        });
        Schema::table('stories', function (Blueprint $table) {
            if (!Schema::hasColumn('stories', 'generation_settings')) $table->json('generation_settings')->nullable();
        });
        Schema::create('ai_credit_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('subscription_credits')->default(0);
            $table->unsignedBigInteger('purchased_credits')->default(0);
            $table->unsignedBigInteger('reserved_credits')->default(0);
            $table->unsignedBigInteger('consumed_this_cycle')->default(0);
            $table->timestamp('cycle_started_at')->nullable();
            $table->timestamps();
        });
        Schema::create('ai_credit_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('story_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('subscription_amount')->default(0);
            $table->unsignedBigInteger('purchased_amount')->default(0);
            $table->timestamp('subscription_cycle_started_at')->nullable();
            $table->string('status', 20)->default('reserved');
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
        Schema::create('ai_credit_reservation_outputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('ai_credit_reservations')->cascadeOnDelete();
            $table->string('output_type', 40);
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('subscription_amount')->default(0);
            $table->unsignedBigInteger('purchased_amount')->default(0);
            $table->string('status', 20)->default('reserved');
            $table->timestamps();
            $table->unique(['reservation_id', 'output_type']);
        });
        Schema::create('ai_credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('story_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained('ai_credit_reservations')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40);
            $table->string('bucket', 24)->default('subscription');
            $table->bigInteger('amount');
            $table->string('status', 24)->default('completed');
            $table->string('reference')->nullable()->unique();
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['story_id', 'type']);
        });
        Schema::create('ai_generation_pricing', function (Blueprint $table) {
            $table->id();
            $table->string('operation', 80)->unique();
            $table->unsignedInteger('base_credits')->default(0);
            $table->unsignedInteger('per_unit_credits')->default(0);
            $table->string('unit', 32)->default('request');
            $table->boolean('is_enabled')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
        Schema::create('ai_credit_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('credits');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
        Schema::table('my_fatoorah_checkout_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('my_fatoorah_checkout_sessions', 'purpose')) $table->string('purpose')->default('subscription');
            if (!Schema::hasColumn('my_fatoorah_checkout_sessions', 'credit_package_id')) $table->foreignId('credit_package_id')->nullable()->constrained('ai_credit_packages')->nullOnDelete();
        });

        foreach ([
            ['story_text', 10, 1, 'story'],
            ['narration_audio', 0, 15, 'minute'],
            ['storybook_page', 0, 5, 'page'],
            ['coloring_page', 0, 4, 'page'],
            ['video_scene', 0, 35, 'scene'],
        ] as [$operation, $base, $unitCost, $unit]) {
            DB::table('ai_generation_pricing')->insertOrIgnore([
                'operation' => $operation, 'base_credits' => $base, 'per_unit_credits' => $unitCost,
                'unit' => $unit, 'is_enabled' => true, 'version' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ([
            ['250 Credits', 'credits-250', 250, 5.99, 1],
            ['600 Credits', 'credits-600', 600, 11.99, 2],
            ['1,500 Credits', 'credits-1500', 1500, 24.99, 3],
            ['3,500 Credits', 'credits-3500', 3500, 49.99, 4],
        ] as [$name, $slug, $credits, $price, $sort]) {
            DB::table('ai_credit_packages')->insertOrIgnore([
                'name' => $name, 'slug' => $slug, 'credits' => $credits, 'price' => $price,
                'currency' => 'USD', 'is_active' => true, 'sort_order' => $sort,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach (['free' => 0, 'starter' => 250, 'family' => 750, 'creator' => 1800, 'ultimate' => 4000] as $slug => $credits) {
            DB::table('plans')->where('slug', $slug)->where('monthly_credits', 0)->update(['monthly_credits' => $credits]);
        }

        if (Schema::hasTable('users')) {
            foreach (DB::table('users')->select('id')->orderBy('id')->cursor() as $existingUser) {
                $reference = 'welcome-credit:' . $existingUser->id;
                if (DB::table('ai_credit_transactions')->where('reference', $reference)->exists()) continue;
                DB::table('ai_credit_wallets')->insertOrIgnore([
                    'user_id' => $existingUser->id, 'subscription_credits' => 0, 'purchased_credits' => 0,
                    'reserved_credits' => 0, 'consumed_this_cycle' => 0, 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('ai_credit_wallets')->where('user_id', $existingUser->id)->increment('subscription_credits', 30);
                DB::table('ai_credit_transactions')->insert([
                    'user_id' => $existingUser->id, 'type' => 'welcome_grant', 'bucket' => 'subscription',
                    'amount' => 30, 'status' => 'completed', 'reference' => $reference,
                    'description' => 'One-time welcome credits', 'metadata' => json_encode(['one_time' => true]),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }

        if (Schema::hasTable('subscriptions')) {
            $activeSubscriptions = DB::table('subscriptions')
                ->whereIn('status', ['active', 'trialing'])
                ->orderBy('id')->get();
            foreach ($activeSubscriptions as $subscription) {
                $allowance = (int) DB::table('plans')->where('id', $subscription->plan_id)->value('monthly_credits');
                if ($allowance <= 0) continue;
                $period = $subscription->current_period_start ?: $subscription->created_at ?: 'initial';
                $reference = 'subscription-initial:' . $subscription->id . ':' . $period;
                if (DB::table('ai_credit_transactions')->where('reference', $reference)->exists()) continue;
                DB::table('ai_credit_wallets')->insertOrIgnore([
                    'user_id' => $subscription->user_id, 'subscription_credits' => 0, 'purchased_credits' => 0,
                    'reserved_credits' => 0, 'consumed_this_cycle' => 0, 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('ai_credit_wallets')->where('user_id', $subscription->user_id)->increment('subscription_credits', $allowance);
                DB::table('ai_credit_wallets')->where('user_id', $subscription->user_id)->update(['cycle_started_at' => now(), 'updated_at' => now()]);
                DB::table('ai_credit_transactions')->insert([
                    'user_id' => $subscription->user_id, 'type' => 'subscription_renewal', 'bucket' => 'subscription',
                    'amount' => $allowance, 'status' => 'completed', 'reference' => $reference,
                    'description' => 'Initial subscription AI credit allowance',
                    'metadata' => json_encode(['plan_id' => $subscription->plan_id, 'subscription_id' => $subscription->id, 'migration_backfill' => true]),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }

        // Preserve legacy product entitlements as one default generation's
        // equivalent credits using the actual seeded pricing rows. Keep the
        // applied values in each ledger entry so a later price edit cannot
        // change the explanation of this one-time conversion.
        if (Schema::hasTable('user_product_balances') && Schema::hasTable('products')) {
            $price = fn (string $operation, int $units = 1): int => (int) DB::table('ai_generation_pricing')
                ->where('operation', $operation)->value('base_credits')
                + (int) DB::table('ai_generation_pricing')->where('operation', $operation)->value('per_unit_credits') * $units;
            $unitCredits = [
                'story' => $price('story_text'),
                'narration' => $price('narration_audio'),
                'story_book' => $price('storybook_page', 8),
                'coloring_book' => $price('coloring_page', 8),
                'video' => $price('video_scene', 12),
            ];
            foreach (DB::table('user_product_balances')->where('quantity', '>', 0)->get() as $legacy) {
                $slug = DB::table('products')->where('id', $legacy->product_id)->value('slug');
                $credits = (int)($unitCredits[$slug] ?? 0) * (int)$legacy->quantity;
                if ($credits < 1) continue;
                $reference = 'legacy-balance:' . $legacy->user_id . ':' . $legacy->product_id;
                if (DB::table('ai_credit_transactions')->where('reference', $reference)->exists()) continue;
                $wallet = DB::table('ai_credit_wallets')->where('user_id', $legacy->user_id)->first();
                if ($wallet) {
                    DB::table('ai_credit_wallets')->where('id', $wallet->id)->update([
                        'purchased_credits' => (int)$wallet->purchased_credits + $credits, 'updated_at' => now(),
                    ]);
                } else {
                    DB::table('ai_credit_wallets')->insert([
                        'user_id' => $legacy->user_id, 'purchased_credits' => $credits,
                        'subscription_credits' => 0, 'reserved_credits' => 0, 'consumed_this_cycle' => 0,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                DB::table('ai_credit_transactions')->insert([
                    'user_id' => $legacy->user_id, 'type' => 'legacy_conversion', 'bucket' => 'purchased',
                    'amount' => $credits, 'status' => 'completed', 'reference' => $reference,
                    'description' => 'Converted legacy product balance', 'metadata' => json_encode(['product_id' => $legacy->product_id, 'quantity' => $legacy->quantity, 'unit_credits' => $unitCredits[$slug] ?? 0]),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('my_fatoorah_checkout_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('my_fatoorah_checkout_sessions', 'credit_package_id')) $table->dropConstrainedForeignId('credit_package_id');
            if (Schema::hasColumn('my_fatoorah_checkout_sessions', 'purpose')) $table->dropColumn('purpose');
        });
        Schema::table('ai_credit_reservations', function (Blueprint $table) {
            $table->dropColumn('subscription_cycle_started_at');
        });
        Schema::dropIfExists('ai_credit_packages');
        Schema::dropIfExists('ai_generation_pricing');
        Schema::dropIfExists('ai_credit_reservation_outputs');
        Schema::dropIfExists('ai_credit_reservations');
        Schema::dropIfExists('ai_credit_transactions');
        Schema::dropIfExists('ai_credit_wallets');
        Schema::table('stories', fn (Blueprint $table) => $table->dropColumn('generation_settings'));
        Schema::table('plans', fn (Blueprint $table) => $table->dropColumn('monthly_credits'));
    }
};
