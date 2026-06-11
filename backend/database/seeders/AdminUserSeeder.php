<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name'              => 'Admin',
                'email'             => 'admin@admin.com',
                'password'          => Hash::make('admin123456'),
                'role'              => 'super_admin',
                'status'            => 'active',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Admin user created: admin@admin.com / admin123456');
    }
}
