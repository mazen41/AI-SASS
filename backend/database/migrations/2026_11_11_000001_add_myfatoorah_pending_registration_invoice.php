<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->string('myfatoorah_invoice_id')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropUnique(['myfatoorah_invoice_id']);
            $table->dropColumn('myfatoorah_invoice_id');
        });
    }
};
