'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface OrgMember {
  membership_id: number;
  org_role: 'org_admin' | 'therapist' | 'member';
  is_active: number;
  joined_at: string | null;
  invited_at: string | null;
  user_id: number;
  email: string;
  full_name: string | null;
}

interface OrgDetail {
  id: number;
  name: string;
  domain: string | null;
  slug: string | null;
  plan_tier: string;
  billing_email: string | null;
  max_seats: number;
  is_active: number;
  created_at: string;
}

export default function AdminOrganizationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [organization, setOrganization] = useState<OrgDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/organizations/${id}`, { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load organization');
        setOrganization(body.organization);
        setMembers(body.members || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load organization'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Organization not found'}
        </div>
      </div>
    );
  }

  const admins = members.filter((m) => m.org_role === 'org_admin');
  const therapists = members.filter((m) => m.org_role === 'therapist');
  const patients = members.filter((m) => m.org_role === 'member');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin/organizations">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-sm text-gray-500">
              {organization.domain || organization.slug || 'No domain set'} · {organization.plan_tier} plan ·{' '}
              {organization.max_seats} seats
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Admins ({admins.length})
          </h2>
          <MemberTable members={admins} />
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Therapists ({therapists.length})
          </h2>
          <MemberTable members={therapists} />
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Members / Patients ({patients.length})
          </h2>
          <MemberTable members={patients} />
        </section>
      </div>
    </div>
  );
}

function MemberTable({ members }: { members: OrgMember[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-gray-500">None yet.</p>;
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Name</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Email</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map((m) => (
            <tr key={m.membership_id}>
              <td className="px-4 py-2.5 text-gray-900 font-medium">{m.full_name || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{m.email}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    m.joined_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {m.joined_at ? 'Active' : 'Invited'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500">
                {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
