<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_product_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_package_id')->nullable()->constrained('user_packages')->onDelete('cascade');
            $table->integer('quantity')->default(0);
            $table->integer('initial_quantity')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
            $table->index(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_product_balances');
    }
};
