<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\MailTemplate;
use App\Models\MailLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['user', 'subscription.plan'])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('from')) {
            $query->whereDate('issued_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('issued_at', '<=', $request->to);
        }

        $invoices = $query->paginate(20);

        return response()->json($invoices);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = Invoice::with(['user', 'subscription.plan'])->findOrFail($id);
        return response()->json(['invoice' => $invoice]);
    }

    public function markPaid(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update(['status' => 'paid', 'paid_at' => now()]);
        return response()->json(['message' => 'Invoice marked as paid.', 'invoice' => $invoice->fresh()]);
    }

    public function markRefunded(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update(['status' => 'refunded']);
        return response()->json(['message' => 'Invoice marked as refunded.', 'invoice' => $invoice->fresh()]);
    }

    public function resendEmail(int $id): JsonResponse
    {
        $invoice = Invoice::with('user')->findOrFail($id);
        $user = $invoice->user;

        try {
            $template = MailTemplate::findByKey('invoice_created');
            if (!$template) {
                return response()->json(['message' => 'Invoice email template not found. Please create one in Email Templates.'], 404);
            }

            $data = [
                'user_name' => $user->name,
                'invoice_number' => $invoice->invoice_number,
                'amount' => '$' . number_format($invoice->amount, 2),
                'plan_name' => $invoice->items[0]['name'] ?? 'N/A',
                'date' => $invoice->issued_at?->format('M d, Y') ?? now()->format('M d, Y'),
                'status' => ucfirst($invoice->status),
            ];

            $subject = $template->renderSubject($data);
            $html = $template->renderHtml($data);

            Mail::html($html, function ($message) use ($user, $subject) {
                $message->to($user->email, $user->name)
                    ->subject($subject);
            });

            MailLog::create([
                'template_key' => 'invoice_created',
                'to_email' => $user->email,
                'subject' => $subject,
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            return response()->json(['message' => 'Invoice email resent to ' . $user->email]);
        } catch (\Exception $e) {
            Log::error('Resend invoice email failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to resend email: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Summary stats for admin dashboard integration.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total' => Invoice::count(),
            'paid' => Invoice::where('status', 'paid')->count(),
            'pending' => Invoice::where('status', 'pending')->count(),
            'refunded' => Invoice::where('status', 'refunded')->count(),
            'total_revenue' => Invoice::where('status', 'paid')->sum('amount'),
        ]);
    }
}
