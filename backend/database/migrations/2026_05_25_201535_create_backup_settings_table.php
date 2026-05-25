<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_enabled')->default(false);
            $table->string('destination')->default('local'); // local, s3, wasabi, google_drive
            $table->string('local_path')->default('backups');
            $table->text('s3_key')->nullable(); // encrypted
            $table->text('s3_secret')->nullable(); // encrypted
            $table->string('region')->nullable(); // s3/wasabi region
            $table->string('bucket')->nullable(); // s3/wasabi bucket
            $table->string('endpoint')->nullable(); // wasabi custom endpoint
            $table->string('google_folder_id')->nullable();
            $table->text('google_json_key')->nullable(); // encrypted
            $table->string('backup_time')->default('00:00'); // format: HH:MM
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_settings');
    }
};
