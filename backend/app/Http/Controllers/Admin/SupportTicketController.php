<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['open', 'pending', 'resolved', 'closed'])],
            'search' => ['sometimes', 'string', 'max:120'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = SupportTicket::with(['user:id,name,email', 'assignedAdmin:id,name'])->withCount('messages')->latest('last_message_at');
        if (isset($data['status'])) $query->where('status', $data['status']);
        if (!empty($data['search'])) $query->where(fn ($q) => $q->where('ticket_number', 'like', '%' . $data['search'] . '%')->orWhere('subject', 'like', '%' . $data['search'] . '%')->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%' . $data['search'] . '%')->orWhere('name', 'like', '%' . $data['search'] . '%')));
        return response()->json($query->paginate($data['per_page'] ?? 20));
    }

    public function show(SupportTicket $ticket): JsonResponse
    {
        return response()->json(['ticket' => $ticket->load(['user:id,name,email', 'assignedAdmin:id,name', 'messages.sender:id,name,role'])]);
    }

    public function update(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['open', 'pending', 'resolved', 'closed'])],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'assigned_admin_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->whereIn('role', ['admin', 'super_admin'])->where('status', 'active'))],
        ]);
        $old = $ticket->only(['status', 'priority', 'assigned_admin_id']);
        $ticket->update($data);
        ActivityLog::log('support_ticket_updated', $request->user()->id, 'SupportTicket', $ticket->id, $old, $ticket->only(['status', 'priority', 'assigned_admin_id']));
        return response()->json(['ticket' => $ticket->fresh()->load(['user:id,name,email', 'assignedAdmin:id,name', 'messages.sender:id,name,role'])]);
    }

    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        if ($ticket->status === 'closed') return response()->json(['message' => 'Reopen the ticket before replying.'], 409);
        $data = $request->validate(['message' => ['required', 'string', 'min:1', 'max:10000']]);
        $ticket->messages()->create(['sender_id' => $request->user()->id, 'sender_type' => 'admin', 'body' => trim($data['message'])]);
        $ticket->update(['status' => 'pending', 'last_message_at' => now()]);
        ActivityLog::log('support_ticket_replied', $request->user()->id, 'SupportTicket', $ticket->id, null, ['status' => 'pending', 'message_length' => mb_strlen(trim($data['message']))]);
        return response()->json(['ticket' => $ticket->fresh()->load(['user:id,name,email', 'messages.sender:id,name,role'])]);
    }
}
