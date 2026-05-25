<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_settings', function (Blueprint $table) {
            $table->id();
            $table->string('driver')->unique(); // local, s3, wasabi
            $table->boolean('is_active')->default(false);
            $table->text('key')->nullable(); // encrypted
            $table->text('secret')->nullable(); // encrypted
            $table->string('region')->nullable();
            $table->string('bucket')->nullable();
            $table->string('endpoint')->nullable();
            $table->boolean('use_path_style_endpoint')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage_settings');
    }
};
