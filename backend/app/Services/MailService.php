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
            return true;
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
            [
                'key' => 'invoice_created',
                'name' => 'Invoice Created',
                'subject' => 'Your Invoice {{invoice_number}} is Ready',
                'html_content' => '<h1>Invoice {{invoice_number}}</h1><p>Hello {{user_name}},</p><p>Your invoice for {{plan_name}} has been generated.</p><p>Amount: {{amount}}</p><p>Date: {{date}}</p><p>Status: {{status}}</p>',
                'text_content' => 'Invoice {{invoice_number}}. Hello {{user_name}}, Your invoice for {{plan_name}} has been generated. Amount: {{amount}}, Date: {{date}}, Status: {{status}}',
                'description' => 'Sent when a new invoice is created',
                'variables' => ['user_name', 'invoice_number', 'plan_name', 'amount', 'date', 'status'],
            ],
            [
                'key' => 'subscription_renewal_reminder',
                'name' => 'Subscription Renewal Reminder',
                'subject' => 'Your subscription at {{app_name}} is renewing soon',
                'html_content' => '<h1>Subscription Renewal Notice</h1><p>Hello {{user_name}},</p><p>This is a friendly reminder that your subscription to the {{plan_name}} plan is scheduled to renew in {{days_remaining}} days on {{renewal_date}}.</p><p>Renewal Amount: {{amount}}</p><p>Thank you for using our service!</p>',
                'text_content' => 'Subscription Renewal Notice. Hello {{user_name}}, your {{plan_name}} subscription is renewing in {{days_remaining}} days on {{renewal_date}}. Renewal Amount: {{amount}}.',
                'description' => 'Sent to users a few days before their subscription renews',
                'variables' => ['app_name', 'user_name', 'plan_name', 'days_remaining', 'renewal_date', 'amount'],
            ],
            [
                'key' => 'login_notification',
                'name' => 'Login Notification',
                'subject' => 'New login to your {{app_name}} account',
                'html_content' => '<h1>New Login Detected</h1><p>Hello {{user_name}},</p><p>We detected a new login to your {{app_name}} account.</p><p><strong>IP Address:</strong> {{ip_address}}</p><p><strong>Date & Time:</strong> {{datetime}}</p><p><strong>Browser/Device:</strong> {{user_agent}}</p><p>If this was not you, please secure your account immediately.</p>',
                'text_content' => 'New Login Detected. Hello {{user_name}}, we detected a new login to your {{app_name}} account. IP: {{ip_address}}, Time: {{datetime}}, Device: {{user_agent}}.',
                'description' => 'Sent to user upon successful login',
                'variables' => ['app_name', 'user_name', 'ip_address', 'datetime', 'user_agent'],
            ],
            [
                'key' => 'login_attempt_failed',
                'name' => 'Failed Login Attempt',
                'subject' => 'Failed login attempt on your {{app_name}} account',
                'html_content' => '<h1>Failed Login Attempt Detected</h1><p>Hello {{user_name}},</p><p>A failed login attempt was made on your {{app_name}} account.</p><p><strong>IP Address:</strong> {{ip_address}}</p><p><strong>Date & Time:</strong> {{datetime}}</p><p><strong>Browser/Device:</strong> {{user_agent}}</p><p>If this was you, you can ignore this email. Otherwise, please ensure your account password is secure.</p>',
                'text_content' => 'Failed Login Attempt. Hello {{user_name}}, a failed login attempt was made on your {{app_name}} account. IP: {{ip_address}}, Time: {{datetime}}, Device: {{user_agent}}.',
                'description' => 'Sent to user when a login attempt fails',
                'variables' => ['app_name', 'user_name', 'ip_address', 'datetime', 'user_agent'],
            ],
        ];
    }
}
