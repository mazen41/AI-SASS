<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\LegalAcceptance;
use App\Models\User;
use App\Models\Package;

class PendingRegistration extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'email', 'password_hash', 'package_id',
        'terms_version', 'privacy_version', 'legal_accepted_at',
        'otp_hash', 'otp_expires_at', 'otp_attempts', 'otp_resend_count',
        'last_otp_sent_at', 'email_verified_at', 'status',
        'moyasar_payment_id', 'myfatoorah_invoice_id', 'created_user_id', 'token_claimed_at', 'expires_at',
    ];

    // Never expose hashes to any accidental json()/toArray() response.
    protected $hidden = ['password_hash', 'otp_hash'];

    protected function casts(): array
    {
        return [
            'otp_expires_at'    => 'datetime',
            'last_otp_sent_at'  => 'datetime',
            'email_verified_at' => 'datetime',
            'legal_accepted_at' => 'datetime',
            'token_claimed_at'  => 'datetime',
            'expires_at'        => 'datetime',
        ];
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    public function createdUser()
    {
        return $this->belongsTo(User::class, 'created_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Create the real `users` row + assign the package. Called from EXACTLY
     * two places: RegistrationController::complete() for free packages, and
     * MoyasarWebhookController::handlePaymentPaid() for paid packages after
     * payment is confirmed. Idempotent — safe to call twice (e.g. a
     * duplicate webhook delivery) because it checks created_user_id first.
     */
    public function createUserAndComplete(): User
    {
        if ($this->created_user_id) {
            return $this->createdUser; // already done — idempotent guard
        }

        return \Illuminate\Support\Facades\DB::transaction(function () {
            $user = User::create([
                'name'              => $this->name,
                'email'             => $this->email,
                // Already a bcrypt hash from Hash::make() at initiate() time.
                // Laravel's 'hashed' cast on User::password detects an
                // already-hashed value via Hash::isHashed() and will NOT
                // re-hash it — verify this holds if the User cast ever changes.
                'password'          => $this->password_hash,
                'email_verified_at' => $this->email_verified_at ?? now(),
            ]);

            if ($this->legal_accepted_at && $this->terms_version && $this->privacy_version) {
                LegalAcceptance::create([
                    'user_id' => $user->id,
                    'terms_version' => $this->terms_version,
                    'privacy_version' => $this->privacy_version,
                    'accepted_at' => $this->legal_accepted_at,
                ]);
            }

            if ($this->package_id) {
                $user->assignPackage($this->package_id);
            }

            // Assign matching Subscription Plan & grant AI credits
            try {
                $plan = null;
                if ($this->package) {
                    $cleanName = trim(preg_replace('/\(.*?\)/', '', $this->package->name));
                    $plan = Plan::where('name', $cleanName)
                        ->orWhere('slug', strtolower($cleanName))
                        ->first();
                }
                if (!$plan) {
                    $plan = Plan::where('slug', 'free')->first();
                }

                if ($plan) {
                    Subscription::updateOrCreate(
                        ['user_id' => $user->id, 'status' => 'active'],
                        [
                            'plan_id' => $plan->id,
                            'gateway' => (float)$plan->price <= 0 ? 'free' : 'registration',
                            'gateway_subscription_id' => 'reg_' . $user->id . '_' . time(),
                            'gateway_customer_id' => 'reg_' . $user->id,
                            'status' => 'active',
                            'current_period_start' => now(),
                            'current_period_end' => now()->addMonth(),
                        ]
                    );

                    if ($plan->monthly_credits > 0) {
                        $reference = 'reg_grant:' . $user->id . ':' . now()->format('Y-m');
                        app(\App\Services\AiCreditService::class)->grantPlanCredits($user, $plan, $reference);
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed auto-enrolling user to plan on registration', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            $this->update(['status' => 'completed', 'created_user_id' => $user->id]);

            return $user;
        });
    }
}
