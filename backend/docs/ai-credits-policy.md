# AI credits: current billing policy

This policy describes the behavior implemented by the centralized credit ledger. The initial generation prices seeded by migration are **provisional examples**, not provider-cost-backed commercial prices. Review and set them in Admin → AI Credits before enabling paid generation for customers.

## Balance buckets and subscriptions

- Free accounts receive 30 one-time welcome credits. The unique `welcome-credit:{user_id}` ledger reference prevents a repeat grant.
- Paid plan allowances are granted only after a verified provider payment/renewal event. Provider event or invoice references make webhook retries idempotent.
- Subscription credits roll over until spent in this release. Each successful allowance grant starts a new usage cycle and resets the displayed cycle-consumed counter; it does not erase remaining credits.
- Purchased credits are held in a separate bucket and are not reset on renewal. They do not currently expire.
- Existing product entitlements are converted once to the current seeded equivalent of one default generation (story 1, narration 1 minute, books 8 pages, video 12 scenes); the applied amount and source quantity are kept in the ledger. Because seeded generation prices are provisional, review converted legacy balances before treating them as cash-equivalent value.
- Failed subscription payments do not grant an allowance. Cancellation stops future grants; existing balances remain available.
- A plan change uses the allowance attached to the next verified payment event. There is no prorated credit adjustment at the moment of change.

## Generation, reservations, and refunds

- The backend computes every estimate and reservation from enabled pricing rows. Client-supplied credit amounts are ignored.
- A database transaction locks the wallet, allocates subscription credits first, then purchased credits, and creates one reservation per story plus one line per selected output.
- Each output is finalized once when its deliverable is persisted. For storybooks and coloring books, this is when the generated PDF is successfully stored. Generated text/audio/video can be finalized independently.
- A permanent failure refunds only outputs that remain reserved. Successfully delivered outputs stay charged. This is the partial-generation policy.
- Repeated failures/refunds are idempotent. A reservation older than 24 hours is released only after its story is no longer processing; active jobs keep their reservation.
- The legacy product regeneration endpoint is disabled so it cannot start unreserved billable work. PDF uploads require a selected output with a live reservation.

## Payment refunds and pricing caveats

- Credit-pack fulfillment requires MyFatoorah's server-side invoice status, amount, currency, and a successful transaction record. The browser return URL never grants credits.
- Paid subscription allowances are handled from verified MyFatoorah, Stripe, PayPal, and Moyasar payment events; duplicate references do not mutate the wallet twice.
- Automated provider refund/dispute clawback is not implemented. If a payment is refunded or disputed, an administrator must review the account and make a reasoned ledger adjustment; do not assume the associated credits have been removed automatically.
- Provider cost, token usage, model/version, Fal.ai attempt count, video seconds, and actual gross margin are not yet recorded per generation. Admin analytics therefore reports application credit/revenue ledger data, not actual AI-provider cost or profit.
- Current price rules model story text, narration minutes, book pages, coloring pages, and video scenes. Model-specific rates, image resolution/attempt multipliers, and provider cost reconciliation still need instrumentation before claiming that prices exactly track upstream spend.
