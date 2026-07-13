'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeading } from '@/components/ui/section-heading';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DataTable } from '@/components/dashboard/data-table';
import { getPlanByTier, calculatePrice, type BillingCycle } from '@/lib/subscription-plans';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Subscription {
  plan_tier: string;
  price_per_seat: number;
  max_seats: number | null;
  billing_cycle: BillingCycle;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface BillingData {
  subscription: Subscription | null;
  plan_tier: string;
  max_seats: number | null;
  seats_used: number;
}

interface Invoice extends Record<string, unknown> {
  id: number;
  amount_paid: number;
  seats_billed: number | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  invoice_pdf_url: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  open: 'bg-yellow-100 text-yellow-700',
  void: 'bg-gray-100 text-gray-500',
  uncollectible: 'bg-red-100 text-red-700',
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function BillingOverviewContent() {
  const searchParams = useSearchParams();
  const justSubscribed = Boolean(searchParams.get('session_id'));

  const [data, setData] = useState<BillingData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [portalLoading, setPortalLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const [seatsDialogOpen, setSeatsDialogOpen] = useState(false);
  const [newSeats, setNewSeats] = useState(1);
  const [seatsSaving, setSeatsSaving] = useState(false);
  const [seatsError, setSeatsError] = useState('');

  const loadBilling = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/organization/billing/subscription', { credentials: 'include' }),
        fetch('/api/organization/billing/invoices?limit=5', { credentials: 'include' }),
      ]);
      const subBody = await subRes.json();
      const invBody = await invRes.json();
      if (!subRes.ok || !subBody.success) throw new Error(subBody.error || 'Failed to load billing');
      setData(subBody.data);
      if (subBody.data.subscription?.max_seats) setNewSeats(subBody.data.subscription.max_seats);
      if (invRes.ok && invBody.success) setInvoices(invBody.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManagePaymentMethod = async () => {
    setPortalLoading(true);
    setActionMessage('');
    try {
      const response = await fetch('/api/organization/billing/portal', { method: 'POST', credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to open billing portal');
      window.location.href = body.data.url;
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handleReactivate = async () => {
    setReactivateLoading(true);
    setActionMessage('');
    try {
      const response = await fetch('/api/organization/billing/subscription/reactivate', { method: 'POST', credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to reactivate plan');
      await loadBilling();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to reactivate plan');
    } finally {
      setReactivateLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Your plan will remain active until the end of the current billing period. Continue?')) return;
    setCancelLoading(true);
    setActionMessage('');
    try {
      const response = await fetch('/api/organization/billing/subscription/cancel', { method: 'POST', credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to cancel plan');
      await loadBilling();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to cancel plan');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpdateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeatsSaving(true);
    setSeatsError('');
    try {
      const response = await fetch('/api/organization/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ seats: newSeats }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to update seats');
      setSeatsDialogOpen(false);
      await loadBilling();
    } catch (err) {
      setSeatsError(err instanceof Error ? err.message : 'Failed to update seats');
    } finally {
      setSeatsSaving(false);
    }
  };

  const invoiceColumns = [
    { key: 'created_at' as const, header: 'Date', render: (_v: any, row: Invoice) => formatDate(row.created_at) },
    { key: 'amount_paid' as const, header: 'Amount', render: (_v: any, row: Invoice) => formatCents(row.amount_paid) },
    { key: 'seats_billed' as const, header: 'Seats', render: (_v: any, row: Invoice) => row.seats_billed ?? '—' },
    { key: 'status' as const, header: 'Status', render: (_v: any, row: Invoice) => <StatusChip status={row.status} /> },
    {
      key: 'invoice_pdf_url' as const,
      header: 'PDF',
      render: (_v: any, row: Invoice) =>
        row.invoice_pdf_url ? (
          <a href={row.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-black underline">
            Download
          </a>
        ) : (
          '—'
        ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Something went wrong loading your billing details.'}
      </div>
    );
  }

  const { subscription } = data;
  const plan = subscription ? getPlanByTier(subscription.plan_tier) : null;
  const totalCost = subscription ? subscription.price_per_seat * (subscription.max_seats ?? data.seats_used) : 0;

  return (
    <div className="space-y-8">
      <SectionHeading align="left" variant="light" title="Billing" description="Manage your subscription, seats, and payment details." />

      {justSubscribed ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
          Subscription activated. Welcome aboard!
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{actionMessage}</div>
      ) : null}

      {!subscription ? (
        <div className="rounded-3xl border border-black/20 bg-white p-10 text-center shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
          <h2 className="text-lg font-semibold text-black">No active plan yet</h2>
          <p className="mt-2 text-sm text-black/60">
            You&apos;re currently on the default plan with {data.max_seats ?? 10} seat{(data.max_seats ?? 10) === 1 ? '' : 's'}. Subscribe to unlock more seats and billed usage.
          </p>
          <Link href="/organization/billing/plans">
            <Button className="mt-6">View Plans</Button>
          </Link>
        </div>
      ) : (
        <>
          {subscription.cancel_at_period_end ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-5 py-4 text-sm text-yellow-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Your plan will end on {formatDate(subscription.current_period_end)}. You&apos;ll keep access until then.</span>
              <Button size="sm" variant="outline" disabled={reactivateLoading} onClick={handleReactivate}>
                {reactivateLoading ? 'Reactivating…' : 'Reactivate'}
              </Button>
            </div>
          ) : null}

          <div className="rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">Current Plan</p>
                <h2 className="mt-1 text-2xl font-semibold capitalize text-black">{plan?.name || subscription.plan_tier}</h2>
                <p className="mt-1 text-sm text-black/60">
                  {data.seats_used} of {subscription.max_seats ?? '∞'} seats used
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-black">{formatCents(totalCost)}</p>
                <p className="text-sm text-black/50">/ {subscription.billing_cycle === 'annual' ? 'year' : 'month'}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/10 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">Billing Cycle</p>
                <p className="mt-1 text-sm font-medium capitalize text-black">{subscription.billing_cycle}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">Status</p>
                <p className="mt-1 text-sm font-medium capitalize text-black">{subscription.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">Renews</p>
                <p className="mt-1 text-sm font-medium text-black">{formatDate(subscription.current_period_end)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-black/10 pt-6">
              <Link href="/organization/billing/plans">
                <Button variant="outline" size="sm">Change Plan</Button>
              </Link>
              <Button variant="outline" size="sm" disabled={portalLoading} onClick={handleManagePaymentMethod}>
                {portalLoading ? 'Opening…' : 'Manage Payment Method'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSeatsDialogOpen(true)}>
                Update Seats
              </Button>
              {!subscription.cancel_at_period_end ? (
                <Button variant="destructive" size="sm" disabled={cancelLoading} onClick={handleCancel}>
                  {cancelLoading ? 'Canceling…' : 'Cancel Plan'}
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Recent Invoices</h2>
          <Link href="/organization/billing/invoices" className="text-sm font-semibold text-black underline">
            View All Invoices
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="rounded-3xl border border-black/20 bg-white p-8 text-center text-sm text-black/60 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
            No invoices yet.
          </div>
        ) : (
          <DataTable columns={invoiceColumns} data={invoices} />
        )}
      </div>

      <Dialog open={seatsDialogOpen} onOpenChange={setSeatsDialogOpen}>
        <DialogContent onClose={() => setSeatsDialogOpen(false)}>
          <form onSubmit={handleUpdateSeats} className="space-y-5">
            <h2 className="text-lg font-semibold text-black">Update Seats</h2>
            <div>
              <Label htmlFor="new-seats">New seat count</Label>
              <div className="mt-2">
                <Input
                  id="new-seats"
                  type="number"
                  min={data.seats_used}
                  value={newSeats}
                  onChange={(e) => setNewSeats(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
            {subscription ? (
              <p className="text-xs text-black/60">
                You&apos;ll be charged a prorated amount for the rest of this billing period, then{' '}
                <span className="font-semibold text-black">
                  {formatCents(calculatePrice(subscription.plan_tier, newSeats, subscription.billing_cycle))}
                </span>{' '}
                / {subscription.billing_cycle === 'annual' ? 'year' : 'month'} going forward.
              </p>
            ) : null}
            {seatsError ? <p className="text-sm text-red-600">{seatsError}</p> : null}
            <Button type="submit" className="w-full" disabled={seatsSaving}>
              {seatsSaving ? 'Saving…' : 'Confirm'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationBillingPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-black/50">Loading…</div>}>
      <BillingOverviewContent />
    </Suspense>
  );
}
