'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { DataTable } from '@/components/dashboard/data-table';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

export default function OrganizationInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organization/billing/invoices?page=${page}&limit=20`, { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load invoices');
        setInvoices(body.data || []);
        setTotalPages(body.pagination?.totalPages || 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [page]);

  const columns = [
    { key: 'created_at' as const, header: 'Date', render: (_v: any, row: Invoice) => formatDate(row.created_at) },
    { key: 'amount_paid' as const, header: 'Amount', render: (_v: any, row: Invoice) => formatCents(row.amount_paid) },
    { key: 'seats_billed' as const, header: 'Seats Billed', render: (_v: any, row: Invoice) => row.seats_billed ?? '—' },
    {
      key: 'period_start' as const,
      header: 'Period',
      render: (_v: any, row: Invoice) => `${formatDate(row.period_start)} – ${formatDate(row.period_end)}`,
    },
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

  return (
    <div className="space-y-8">
      <SectionHeading align="left" variant="light" title="Invoices" description="Full billing history for your organization." />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl border border-black/20 bg-white p-12 text-center shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
          <p className="text-sm text-black/60">No invoices yet.</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={invoices} />
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-black/60">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
