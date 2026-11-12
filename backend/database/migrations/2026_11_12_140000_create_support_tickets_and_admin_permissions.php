<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ticket_number', 32)->unique();
            $table->string('subject', 180);
            $table->string('category', 40)->default('general');
            $table->string('priority', 20)->default('normal');
            $table->string('status', 24)->default('open')->index();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
            $table->index(['user_id', 'updated_at']);
        });

        Schema::create('support_ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sender_type', 16); // customer | admin | system
            $table->text('body');
            $table->timestamps();
            $table->index(['ticket_id', 'id']);
        });

        $permissions = [
            'support.view' => 'View and respond to support tickets',
            'support.manage' => 'Manage ticket status, priority, and assignment',
            'generation.support' => 'Inspect generation failures and credit reservation diagnostics',
            'payments.audit' => 'Inspect payment reconciliation and provider status',
        ];
        foreach ($permissions as $key => $description) {
            DB::table('admin_permissions')->updateOrInsert(['key' => $key], [
                'description' => $description, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $defaultRole = DB::table('admin_roles')->where('slug', 'administrator')->value('id');
        if ($defaultRole) {
            foreach (array_keys($permissions) as $key) {
                DB::table('admin_role_permissions')->updateOrInsert(
                    ['admin_role_id' => $defaultRole, 'permission_key' => $key], ['admin_role_id' => $defaultRole, 'permission_key' => $key]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
        DB::table('admin_role_permissions')->whereIn('permission_key', ['support.view', 'support.manage', 'generation.support', 'payments.audit'])->delete();
        DB::table('admin_permissions')->whereIn('key', ['support.view', 'support.manage', 'generation.support', 'payments.audit'])->delete();
    }
};
