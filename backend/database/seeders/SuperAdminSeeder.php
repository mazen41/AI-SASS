<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use App\Models\PaymentSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Create Super Admin
        User::updateOrCreate(
            ['email' => 'admin@storyhero.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password123'),
                'role' => 'super_admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        // Create sample plans
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Perfect for individuals getting started',
                'price' => 9.99,
                'billing_period' => 'monthly',
                'features' => ['5 Projects', '10GB Storage', 'Email Support', 'Basic Analytics'],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'description' => 'For growing teams and businesses',
                'price' => 29.99,
                'billing_period' => 'monthly',
                'features' => ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Advanced Analytics', 'API Access'],
                'is_active' => true,
                'is_featured' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'For large organizations',
                'price' => 99.99,
                'billing_period' => 'monthly',
                'features' => ['Unlimited Everything', '1TB Storage', '24/7 Support', 'Custom Analytics', 'API Access', 'SSO', 'Dedicated Account Manager'],
                'is_active' => true,
                'is_featured' => false,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        // Initialize payment settings
        PaymentSetting::updateOrCreate(
            ['gateway' => 'stripe'],
            [
                'is_enabled' => false,
                'is_sandbox' => true,
            ]
        );

        PaymentSetting::updateOrCreate(
            ['gateway' => 'paypal'],
            [
                'is_enabled' => false,
                'is_sandbox' => true,
            ]
        );
    }
}
