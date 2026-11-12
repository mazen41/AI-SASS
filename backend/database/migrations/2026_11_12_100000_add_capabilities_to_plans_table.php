<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'yearly_price')) {
                $table->decimal('yearly_price', 10, 2)->nullable()->after('price');
            }
            if (!Schema::hasColumn('plans', 'is_public')) {
                $table->boolean('is_public')->default(true)->after('is_featured');
            }
            if (!Schema::hasColumn('plans', 'icon')) {
                $table->string('icon', 50)->nullable()->after('sort_order');
            }
            if (!Schema::hasColumn('plans', 'badge')) {
                $table->string('badge', 50)->nullable()->after('icon');
            }
            if (!Schema::hasColumn('plans', 'trial_days')) {
                $table->unsignedInteger('trial_days')->default(0)->after('badge');
            }
            if (!Schema::hasColumn('plans', 'capabilities')) {
                $table->json('capabilities')->nullable()->after('features');
            }
            if (!Schema::hasColumn('plans', 'moyasar_product_id')) {
                $table->string('moyasar_product_id')->nullable()->after('paypal_plan_id');
            }
            if (!Schema::hasColumn('plans', 'myfatoorah_product_id')) {
                $table->string('myfatoorah_product_id')->nullable()->after('moyasar_product_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $columns = [
                'yearly_price',
                'is_public',
                'icon',
                'badge',
                'trial_days',
                'capabilities',
                'moyasar_product_id',
                'myfatoorah_product_id',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('plans', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
