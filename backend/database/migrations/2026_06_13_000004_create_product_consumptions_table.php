<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_consumptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('story_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('story_output_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('quantity')->default(1);
            $table->string('output_type')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'product_id']);
            $table->index(['story_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_consumptions');
    }
};
