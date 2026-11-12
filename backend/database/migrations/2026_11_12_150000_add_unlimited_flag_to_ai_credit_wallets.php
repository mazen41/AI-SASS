<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('ai_credit_wallets', 'is_unlimited')) {
            Schema::table('ai_credit_wallets', function (Blueprint $table) {
                $table->boolean('is_unlimited')->default(false)->after('consumed_this_cycle');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ai_credit_wallets', 'is_unlimited')) {
            Schema::table('ai_credit_wallets', function (Blueprint $table) {
                $table->dropColumn('is_unlimited');
            });
        }
    }
};
