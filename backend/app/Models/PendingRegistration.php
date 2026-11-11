<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PendingRegistration extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'email', 'password_hash', 'package_id',
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

            $user->assignPackage($this->package_id);

            $this->update(['status' => 'completed', 'created_user_id' => $user->id]);

            return $user;
        });
    }
}
