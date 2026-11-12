'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { apiGetAiCreditHistory, apiGetAiCreditPackages, apiGetAiCredits, apiPurchaseAiCreditPackage, AiCreditPackage, AiCreditSummary, AiCreditTransaction } from '@/lib/api';
import { Coins, Loader2, RefreshCw, ShoppingBag } from 'lucide-react';

export default function AiCreditsPanel() {
  const { locale } = useLang();
  const ar = locale === 'ar';
  const [credits, setCredits] = useState<AiCreditSummary | null>(null);
  const [packages, setPackages] = useState<AiCreditPackage[]>([]);
  const [history, setHistory] = useState<AiCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [wallet, packs, transactions] = await Promise.all([apiGetAiCredits(), apiGetAiCreditPackages(), apiGetAiCreditHistory()]);
      setCredits(wallet.credits);
      setPackages(packs.packages);
      setHistory(transactions.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذر تحميل بيانات الرصيد.' : 'Could not load credit details.'));
    } finally { setLoading(false); }
  }, [ar]);

  useEffect(() => { void refresh(); }, [refresh]);

  const buy = async (pack: AiCreditPackage) => {
    setBusy(pack.id); setError('');
    try {
      const result = await apiPurchaseAiCreditPackage(pack.id);
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذر بدء الدفع.' : 'Could not start checkout.'));
      setBusy(null);
    }
  };

  const cards = credits ? [
    [ar ? 'الرصيد المتاح' : 'Available', credits.is_unlimited ? (ar ? 'غير محدود' : 'Unlimited') : credits.available_credits],
    [ar ? 'رصيد الاشتراك' : 'Subscription', credits.subscription_credits],
    [ar ? 'الرصيد المشترى' : 'Purchased', credits.purchased_credits],
    [ar ? 'محجوز حالياً' : 'Reserved', credits.reserved_credits],
    [ar ? 'المستهلك في الدورة' : 'Used this cycle', credits.consumed_this_cycle],
  ] : [];

  return <section id="ai-credits" className="studio-card rounded-3xl border border-white/10 p-5 sm:p-7 space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue"><Coins size={21}/></span><div><h2 className="text-lg font-bold">{ar ? 'رصيد الذكاء الاصطناعي' : 'AI credit balance'}</h2><p className="text-xs text-slate-500">{ar ? 'تُضاف الأرصدة المشتراة بعد تأكيد الدفع فقط.' : 'Purchased credits are added only after payment is verified.'}</p></div></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>{ar ? 'تحديث' : 'Refresh'}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</p>}
    {loading && !credits ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin"/>{ar ? 'جارٍ تحميل الرصيد...' : 'Loading credits…'}</div> : credits && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div></div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{ar ? 'تاريخ بدء دورة الرصيد' : 'Credit cycle started'}: {credits.cycle_started_at ? new Date(credits.cycle_started_at).toLocaleDateString() : (ar ? 'غير متاح' : 'Not available')}</span><span>{ar ? 'التجديد القادم' : 'Next renewal'}: {credits.renewal_at ? new Date(credits.renewal_at).toLocaleDateString() : (ar ? 'لا يوجد اشتراك نشط' : 'No active subscription')}</span></div>
    </>}
    <div className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={16}/>{ar ? 'شراء رصيد إضافي' : 'Buy additional credits'}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{packages.map(pack => <article key={pack.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-4"><div><div className="font-semibold">{Number(pack.credits).toLocaleString()} {ar ? 'رصيد' : 'credits'}</div><div className="mt-1 text-xs text-slate-500">{Number(pack.price).toFixed(2)} {pack.currency}</div></div><button type="button" onClick={() => void buy(pack)} disabled={busy !== null} className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{busy === pack.id ? <Loader2 size={15} className="animate-spin"/> : (ar ? 'شراء' : 'Buy')}</button></article>)}</div></div>
    <div className="space-y-3"><h3 className="text-sm font-bold">{ar ? 'سجل الرصيد' : 'Credit history'}</h3>{history.length ? <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[600px] text-start text-xs"><thead className="bg-white/[0.03] text-slate-500"><tr><th className="p-3">{ar ? 'التاريخ' : 'Date'}</th><th className="p-3">{ar ? 'العملية' : 'Activity'}</th><th className="p-3">{ar ? 'الوصف' : 'Description'}</th><th className="p-3">{ar ? 'المبلغ' : 'Credits'}</th><th className="p-3">{ar ? 'الحالة' : 'Status'}</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="border-t border-white/10"><td className="p-3">{new Date(item.created_at).toLocaleString()}</td><td className="p-3">{item.type.replaceAll('_', ' ')}</td><td className="p-3">{item.description || '—'}</td><td className="p-3 font-semibold">{item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}</td><td className="p-3">{item.status}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">{ar ? 'لا توجد حركات رصيد بعد.' : 'No credit transactions yet.'}</p>}</div>
  </section>;
}
