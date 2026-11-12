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
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'paid', 'failed', 'refunded', 'canceled'])],
            'search' => ['sometimes', 'string', 'max:120'],
            'from' => ['sometimes', 'date'], 'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = Invoice::query()->select(['id', 'user_id', 'subscription_id', 'invoice_number', 'amount', 'currency', 'status', 'gateway', 'gateway_transaction_id', 'issued_at', 'paid_at', 'created_at'])
            ->with(['user:id,name,email', 'subscription:id,plan_id,status', 'subscription.plan:id,name'])->orderByDesc('created_at');

        if (isset($filters['status'])) $query->where('status', $filters['status']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if (isset($filters['from'])) $query->whereDate('issued_at', '>=', $filters['from']);
        if (isset($filters['to'])) $query->whereDate('issued_at', '<=', $filters['to']);

        $invoices = $query->paginate($filters['per_page'] ?? 20);

        return response()->json($invoices);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = Invoice::query()->select(['id', 'user_id', 'subscription_id', 'invoice_number', 'amount', 'currency', 'status', 'gateway', 'gateway_transaction_id', 'issued_at', 'paid_at', 'created_at'])
            ->with(['user:id,name,email', 'subscription:id,plan_id,status', 'subscription.plan:id,name'])->findOrFail($id);
        return response()->json(['invoice' => $invoice]);
    }

    public function markPaid(int $id): JsonResponse
    {
        Invoice::findOrFail($id);
        return response()->json(['message' => 'Manual payment status changes are disabled. Verify settlement with the provider webhook or read-only provider check.'], 409);
    }

    public function markRefunded(int $id): JsonResponse
    {
        Invoice::findOrFail($id);
        return response()->json(['message' => 'A local status change does not refund a charge. Issue refunds from the provider dashboard; verified provider webhooks update the ledger.'], 409);
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
