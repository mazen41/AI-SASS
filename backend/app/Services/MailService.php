<?php

namespace App\Services;

use App\Models\MailLog;
use App\Models\MailSetting;
use App\Models\MailTemplate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailService
{
    public static function configureMail(): bool
    {
        $settings = Cache::remember('mail_settings', 300, function () {
            return MailSetting::getSettings();
        });
        if (!$settings || !$settings->is_enabled) {
            return false;
        }

        Config::set('mail.default', $settings->driver);
        Config::set('mail.mailers.smtp.host', $settings->host);
        Config::set('mail.mailers.smtp.port', $settings->port);
        Config::set('mail.mailers.smtp.encryption', $settings->encryption);
        Config::set('mail.mailers.smtp.username', $settings->username);
        Config::set('mail.mailers.smtp.password', $settings->password);
        Config::set('mail.from.address', $settings->from_address ?: 'noreply@example.com');
        Config::set('mail.from.name', $settings->from_name ?: 'App');

        return true;
    }

    public static function sendWithTemplate(
        string $templateKey,
        string $toEmail,
        array $data = [],
        array $metadata = []
    ): MailLog {
        $template = MailTemplate::findByKey($templateKey);
        if (!$template) {
            $log = MailLog::create([
                'template_key' => $templateKey,
                'to_email' => $toEmail,
                'subject' => 'Unknown Template',
                'status' => 'failed',
                'error_message' => "Template not found: {$templateKey}",
                'metadata' => $metadata,
            ]);
            return $log;
        }

        $subject = $template->renderSubject($data);
        $htmlBody = $template->renderHtml($data);
        $textBody = $template->renderText($data);

        $log = MailLog::create([
            'template_key' => $templateKey,
            'to_email' => $toEmail,
            'subject' => $subject,
            'body' => $htmlBody,
            'status' => 'pending',
            'metadata' => $metadata,
        ]);

        try {
            $configured = self::configureMail();
            if (!$configured) {
                throw new \Exception('Mail not configured or disabled');
            }

            Mail::html($htmlBody, function ($message) use ($toEmail, $subject, $textBody) {
                $message->to($toEmail)->subject($subject);
                if ($textBody) {
                    $message->text($textBody);
                }
            });

            $log->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Mail sending failed: ' . $e->getMessage());
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }

        return $log;
    }

    public static function sendCustom(
        string $toEmail,
        string $subject,
        string $htmlBody,
        ?string $textBody = null
    ): MailLog {
        $log = MailLog::create([
            'to_email' => $toEmail,
            'subject' => $subject,
            'body' => $htmlBody,
            'status' => 'pending',
        ]);

        try {
            $configured = self::configureMail();
            if (!$configured) {
                throw new \Exception('Mail not configured or disabled');
            }

            Mail::html($htmlBody, function ($message) use ($toEmail, $subject, $textBody) {
                $message->to($toEmail)->subject($subject);
                if ($textBody) {
                    $message->text($textBody);
                }
            });

            $log->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Custom mail sending failed: ' . $e->getMessage());
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }

        return $log;
    }

    public static function getDefaultTemplates(): array
    {
        return [
            [
                'key' => 'welcome',
                'name' => 'Welcome Email',
                'subject' => 'Welcome to {{app_name}}',
                'html_content' => '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining {{app_name}}.</p><p>Your email: {{user_email}}</p>',
                'text_content' => 'Welcome {{user_name}}! Thank you for joining {{app_name}}. Your email: {{user_email}}',
                'description' => 'Sent when a new user registers',
                'variables' => ['app_name', 'user_name', 'user_email'],
            ],
            [
                'key' => 'password_reset',
                'name' => 'Password Reset',
                'subject' => 'Reset your password for {{app_name}}',
                'html_content' => '<h1>Password Reset</h1><p>Hello {{user_name}},</p><p>Click the link below to reset your password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>Expires in: {{expires_in}}</p>',
                'text_content' => 'Password Reset. Hello {{user_name}}, use this link to reset your password: {{reset_link}} (Expires in: {{expires_in}})',
                'description' => 'Sent when a user requests a password reset',
                'variables' => ['app_name', 'user_name', 'reset_link', 'expires_in'],
            ],
            [
                'key' => 'subscription_created',
                'name' => 'Subscription Created',
                'subject' => 'Your subscription at {{app_name}}',
                'html_content' => '<h1>Subscription Created</h1><p>Hello {{user_name}},</p><p>Your {{plan_name}} subscription has been created.</p><p>Amount: {{amount}}</p><p>Status: {{status}}</p>',
                'text_content' => 'Subscription Created. Hello {{user_name}}, your {{plan_name}} subscription has been created. Amount: {{amount}}, Status: {{status}}',
                'description' => 'Sent when a new subscription is created',
                'variables' => ['app_name', 'user_name', 'plan_name', 'amount', 'status'],
            ],
            [
                'key' => 'payment_failed',
                'name' => 'Payment Failed',
                'subject' => 'Payment failed for {{app_name}}',
                'html_content' => '<h1>Payment Failed</h1><p>Hello {{user_name}},</p><p>Your payment of {{amount}} for {{plan_name}} failed.</p><p>Please update your payment method.</p>',
                'text_content' => 'Payment Failed. Hello {{user_name}}, your payment of {{amount}} for {{plan_name}} failed. Please update your payment method.',
                'description' => 'Sent when a payment fails',
                'variables' => ['app_name', 'user_name', 'plan_name', 'amount'],
            ],
            [
                'key' => 'invoice',
                'name' => 'Invoice',
                'subject' => 'Invoice from {{app_name}}',
                'html_content' => '<h1>Invoice #{{invoice_id}}</h1><p>Hello {{user_name}},</p><p>Amount: {{amount}}</p><p>Date: {{date}}</p><p>Status: {{status}}</p>',
                'text_content' => 'Invoice #{{invoice_id}}. Hello {{user_name}}, Amount: {{amount}}, Date: {{date}}, Status: {{status}}',
                'description' => 'Sent when a new invoice is generated',
                'variables' => ['app_name', 'user_name', 'invoice_id', 'amount', 'date', 'status'],
            ],
        ];
    }
}
