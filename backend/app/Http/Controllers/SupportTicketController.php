<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->supportTickets()->with('messages')->latest('updated_at')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'min:4', 'max:180'],
            'category' => ['sometimes', 'string', 'in:general,billing,payments,generation,account,bug'],
            'message' => ['required', 'string', 'min:5', 'max:10000'],
        ]);
        $ticket = $request->user()->supportTickets()->create([
            'ticket_number' => 'NS-' . now()->format('ymd') . '-' . Str::upper(Str::random(6)),
            'subject' => trim($data['subject']), 'category' => $data['category'] ?? 'general',
            'priority' => 'normal', 'status' => 'open', 'last_message_at' => now(),
        ]);
        $ticket->messages()->create(['sender_id' => $request->user()->id, 'sender_type' => 'customer', 'body' => trim($data['message'])]);
        return response()->json(['ticket' => $ticket->load('messages')], 201);
    }

    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        abort_unless($ticket->user_id === $request->user()->id, 404);
        return response()->json(['ticket' => $ticket->load(['messages.sender:id,name,role'])]);
    }

    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        abort_unless($ticket->user_id === $request->user()->id, 404);
        if ($ticket->status === 'closed') return response()->json(['message' => 'This ticket is closed. Create a new ticket to continue.'], 409);
        $data = $request->validate(['message' => ['required', 'string', 'min:1', 'max:10000']]);
        $ticket->messages()->create(['sender_id' => $request->user()->id, 'sender_type' => 'customer', 'body' => trim($data['message'])]);
        $ticket->update(['status' => 'open', 'last_message_at' => now()]);
        return response()->json(['ticket' => $ticket->fresh()->load('messages')]);
    }
}
