<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicketMessage extends Model
{
    protected $fillable = ['ticket_id', 'sender_id', 'sender_type', 'body'];
    public function ticket(): BelongsTo { return $this->belongsTo(SupportTicket::class, 'ticket_id'); }
    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_id'); }
}
