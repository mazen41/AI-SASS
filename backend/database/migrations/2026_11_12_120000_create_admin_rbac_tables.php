<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $permissions = [
        'dashboard.view' => 'View admin dashboard',
        'users.view' => 'View user accounts', 'users.manage' => 'Manage customer accounts',
        'plans.view' => 'View plans', 'plans.manage' => 'Manage plans',
        'credits.view' => 'View AI credit balances', 'credits.adjust' => 'Adjust user credits', 'credits.pricing' => 'Manage AI credit pricing', 'credit_packages.manage' => 'Manage credit packages',
        'addons.manage' => 'Manage add-ons', 'products.manage' => 'Manage products', 'packages.manage' => 'Manage packages',
        'invoices.view' => 'View invoices', 'invoices.manage' => 'Manage invoice status and delivery',
        'payments.manage' => 'Manage payment gateways', 'storage.manage' => 'Manage storage settings', 'backups.manage' => 'Manage backups',
        'auth.manage' => 'Manage authentication settings', 'cms.manage' => 'Manage landing page and blog',
        'subscriptions.view' => 'View subscriptions', 'subscriptions.manage' => 'Manage subscriptions',
        'transactions.view' => 'View transactions', 'audit.view' => 'View audit logs', 'system.view' => 'View system health',
        'mail.view' => 'View mail configuration and logs', 'mail.manage' => 'Manage mail settings and templates',
        'roles.view' => 'View admin roles', 'roles.manage' => 'Manage admin roles and assignments',
    ];

    public function up(): void
    {
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('admin_permissions', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->string('description', 255);
            $table->timestamps();
        });

        Schema::create('admin_role_permissions', function (Blueprint $table) {
            $table->foreignId('admin_role_id')->constrained('admin_roles')->cascadeOnDelete();
            $table->string('permission_key', 100);
            $table->foreign('permission_key')->references('key')->on('admin_permissions')->cascadeOnDelete();
            $table->primary(['admin_role_id', 'permission_key']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('admin_role_id')->nullable()->after('role')->constrained('admin_roles')->nullOnDelete();
        });

        $now = now();
        foreach ($this->permissions as $key => $description) {
            DB::table('admin_permissions')->insert(['key' => $key, 'description' => $description, 'created_at' => $now, 'updated_at' => $now]);
        }

        // Preserve current admin access during rollout. Super-admin remains the only role
        // allowed to manage privileges; custom roles can be narrowed from the admin UI.
        $roleId = DB::table('admin_roles')->insertGetId([
            'name' => 'Administrator', 'slug' => 'administrator', 'is_system' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('admin_role_permissions')->insert(collect(array_keys($this->permissions))->reject(fn ($key) => $key === 'roles.manage')
            ->map(fn ($key) => ['admin_role_id' => $roleId, 'permission_key' => $key])->all());
        DB::table('users')->where('role', 'admin')->update(['admin_role_id' => $roleId]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('admin_role_id');
        });
        Schema::dropIfExists('admin_role_permissions');
        Schema::dropIfExists('admin_permissions');
        Schema::dropIfExists('admin_roles');
    }
};
