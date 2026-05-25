<?php

namespace App\Jobs;

use App\Models\MailLog;
use App\Models\MailTemplate;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendMailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $templateKey;
    public string $toEmail;
    public array $data;
    public array $metadata;

    public function __construct(
        string $templateKey,
        string $toEmail,
        array $data = [],
        array $metadata = []
    ) {
        $this->templateKey = $templateKey;
        $this->toEmail = $toEmail;
        $this->data = $data;
        $this->metadata = $metadata;
    }

    public function handle(): void
    {
        MailService::sendWithTemplate(
            $this->templateKey,
            $this->toEmail,
            $this->data,
            $this->metadata
        );
    }
}
