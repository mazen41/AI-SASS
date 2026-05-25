<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendMailJob;
use App\Models\MailLog;
use App\Models\MailSetting;
use App\Models\MailTemplate;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MailController extends Controller
{
    public function getSettings(): JsonResponse
    {
        $settings = MailSetting::first();
        return response()->json([
            'settings' => $settings ? [
                'id' => $settings->id,
                'driver' => $settings->driver,
                'host' => $settings->host,
                'port' => $settings->port,
                'encryption' => $settings->encryption,
                'username' => $settings->username,
                'from_address' => $settings->from_address,
                'from_name' => $settings->from_name,
                'is_enabled' => $settings->is_enabled,
            ] : null,
        ]);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'driver' => 'required|string|in:smtp,sendmail,mailgun,postmark,ses',
            'host' => 'nullable|string',
            'port' => 'required|integer',
            'encryption' => 'nullable|string|in:tls,ssl,none',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'from_address' => 'nullable|email',
            'from_name' => 'nullable|string',
            'is_enabled' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $settings = MailSetting::first();
        $data = $validator->validated();

        if ($settings) {
            $settings->update($data);
        } else {
            $settings = MailSetting::create($data);
        }

        return response()->json([
            'message' => 'Settings saved successfully',
            'settings' => [
                'id' => $settings->id,
                'driver' => $settings->driver,
                'host' => $settings->host,
                'port' => $settings->port,
                'encryption' => $settings->encryption,
                'username' => $settings->username,
                'from_address' => $settings->from_address,
                'from_name' => $settings->from_name,
                'is_enabled' => $settings->is_enabled,
            ],
        ]);
    }

    public function testConnection(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'test_email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $settings = MailSetting::first();
        if (!$settings || !$settings->is_enabled) {
            return response()->json(['message' => 'Mail is not configured or disabled'], 400);
        }

        $configured = MailService::configureMail();
        if (!$configured) {
            return response()->json(['message' => 'Failed to configure mail'], 500);
        }

        $log = MailService::sendCustom(
            $request->input('test_email'),
            'SMTP Test from ' . ($settings->from_name ?: 'App'),
            '<h1>SMTP Test</h1><p>This is a test email to verify your SMTP configuration.</p><p>Settings: ' . $settings->host . ':' . $settings->port . '</p>',
            'SMTP Test. This is a test email to verify your SMTP configuration. Settings: ' . $settings->host . ':' . $settings->port
        );

        if ($log->status === 'sent') {
            return response()->json(['message' => 'Test email sent successfully']);
        }

        return response()->json([
            'message' => 'Failed to send test email',
            'error' => $log->error_message,
        ], 500);
    }

    public function getTemplates(): JsonResponse
    {
        $templates = MailTemplate::orderBy('name')->get();
        return response()->json(['templates' => $templates]);
    }

    public function getTemplate(string $key): JsonResponse
    {
        $template = MailTemplate::where('key', $key)->firstOrFail();
        return response()->json(['template' => $template]);
    }

    public function saveTemplate(Request $request, ?int $id = null): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'key' => 'required|string|unique:mail_templates,key,' . $id,
            'name' => 'required|string',
            'subject' => 'required|string',
            'html_content' => 'required|string',
            'text_content' => 'nullable|string',
            'description' => 'nullable|string',
            'is_active' => 'required|boolean',
            'variables' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($id) {
            $template = MailTemplate::findOrFail($id);
            $template->update($data);
        } else {
            $template = MailTemplate::create($data);
        }

        return response()->json([
            'message' => 'Template saved successfully',
            'template' => $template,
        ]);
    }

    public function deleteTemplate(int $id): JsonResponse
    {
        $template = MailTemplate::findOrFail($id);
        $template->delete();
        return response()->json(['message' => 'Template deleted']);
    }

    public function previewTemplate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'html_content' => 'required|string',
            'subject' => 'required|string',
            'variables' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $html = $request->input('html_content');
        $subject = $request->input('subject');
        $variables = $request->input('variables', []);

        foreach ($variables as $key => $value) {
            $html = str_replace('{{' . $key . '}}', (string) $value, $html);
            $subject = str_replace('{{' . $key . '}}', (string) $value, $subject);
        }

        // Fill remaining variables with sample data
        preg_match_all('/\{\{(.*?)\}\}/', $html, $matches);
        foreach ($matches[1] as $match) {
            $html = str_replace('{{' . $match . '}}', 'Sample ' . trim($match), $html);
        }

        preg_match_all('/\{\{(.*?)\}\}/', $subject, $matches);
        foreach ($matches[1] as $match) {
            $subject = str_replace('{{' . $match . '}}', 'Sample ' . trim($match), $subject);
        }

        return response()->json([
            'subject' => $subject,
            'html' => $html,
        ]);
    }

    public function testTemplate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'template_key' => 'required|string',
            'to_email' => 'required|email',
            'variables' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $template = MailTemplate::findByKey($request->input('template_key'));
        if (!$template) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        $data = $request->input('variables', []);
        $toEmail = $request->input('to_email');

        $log = MailService::sendWithTemplate(
            $template->key,
            $toEmail,
            $data,
            ['source' => 'admin_test']
        );

        if ($log->status === 'sent') {
            return response()->json(['message' => 'Test email sent successfully']);
        }

        return response()->json([
            'message' => 'Failed to send test email',
            'error' => $log->error_message,
        ], 500);
    }

    public function getLogs(Request $request): JsonResponse
    {
        $query = MailLog::query()->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->has('template_key')) {
            $query->where('template_key', $request->input('template_key'));
        }
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('to_email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate(20);
        return response()->json($logs);
    }

    public function seedDefaultTemplates(): JsonResponse
    {
        $templates = MailService::getDefaultTemplates();
        $created = 0;

        foreach ($templates as $templateData) {
            $exists = MailTemplate::where('key', $templateData['key'])->exists();
            if (!$exists) {
                MailTemplate::create($templateData);
                $created++;
            }
        }

        return response()->json([
            'message' => "{$created} default templates created",
            'templates' => MailTemplate::orderBy('name')->get(),
        ]);
    }
}
