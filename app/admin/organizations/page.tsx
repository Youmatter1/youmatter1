'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminOrganization {
  id: number;
  name: string;
  domain: string | null;
  slug: string | null;
  plan_tier: string;
  is_active: number;
  max_seats: number;
  member_count: number;
  therapist_count: number;
  admin_count: number;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/organizations', { credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to load organizations');
      setOrganizations(body.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/organizations/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to delete organization');
      setOrganizations((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setConfirmText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Organizations</h1>
            <p className="text-sm text-gray-500">Manage all organizations on the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No organizations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {organizations.map((org) => (
              <div key={org.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{org.name}</h3>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            org.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase">
                          {org.plan_tier}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{org.domain || org.slug || 'No domain set'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                        <span>{org.member_count} member{org.member_count === 1 ? '' : 's'}</span>
                        <span>{org.therapist_count} therapist{org.therapist_count === 1 ? '' : 's'}</span>
                        <span>{org.admin_count} admin{org.admin_count === 1 ? '' : 's'}</span>
                        <span>Max seats: {org.max_seats}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/admin/organizations/${org.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg">View</Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        setDeleteTarget(org);
                        setConfirmText('');
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {deleteTarget.name}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This permanently deletes the organization, all {deleteTarget.member_count + deleteTarget.therapist_count}{' '}
              of its members and therapists, plus their sessions, messages, and files. This cannot be undone.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Type <span className="font-semibold">{deleteTarget.name}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none mb-4"
              placeholder={deleteTarget.name}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="rounded-lg flex-1"
                disabled={confirmText !== deleteTarget.name || deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
              <Button
                variant="secondary"
                className="rounded-lg flex-1"
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmText('');
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
