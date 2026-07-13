'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/dashboard/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { SectionHeading } from '@/components/ui/section-heading';

interface OrgMember extends Record<string, unknown> {
  membership_id: number;
  user_id: number;
  email: string;
  full_name: string | null;
  org_role: 'therapist' | 'member';
  is_active: number | boolean;
  invited_at: string | null;
  joined_at: string | null;
  session_count: number;
  last_session_date: string | null;
}

type RoleFilter = 'all' | 'therapist' | 'member';

const ROLE_LABELS: Record<'therapist' | 'member' | 'org_admin', string> = {
  therapist: 'Therapist',
  member: 'Member',
  org_admin: 'Admin',
};

export default function OrganizationMembersPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'therapist'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchMembers = async (filter: RoleFilter) => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/organization/members' : `/api/organization/members?role=${filter}`;
      const response = await fetch(url, { credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to load members');
      setMembers(body.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(roleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteMessage('');
    setInviting(true);
    try {
      const response = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, invite_role: inviteRole, name: inviteName || undefined }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to send invitation');
      setInviteMessage(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      fetchMembers(roleFilter);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (membershipId: number) => {
    if (!confirm('Remove this member from your organization?')) return;
    setRemovingId(membershipId);
    try {
      const response = await fetch(`/api/organization/members/${membershipId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to remove member');
      setMembers((prev) => prev.filter((m) => m.membership_id !== membershipId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const columns = [
    {
      key: 'full_name' as const,
      header: 'Member',
      render: (_value: any, row: OrgMember) => (
        <div>
          <p className="font-semibold text-black">{row.full_name || row.email}</p>
          <p className="text-xs text-black/50">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'org_role' as const,
      header: 'Role',
      render: (_value: any, row: OrgMember) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            row.org_role === 'therapist' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {ROLE_LABELS[row.org_role] || row.org_role}
        </span>
      ),
    },
    {
      key: 'joined_at' as const,
      header: 'Status',
      render: (_value: any, row: OrgMember) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            row.joined_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {row.joined_at ? 'Active' : 'Invited'}
        </span>
      ),
    },
    {
      key: 'session_count' as const,
      header: 'Sessions',
    },
    {
      key: 'last_session_date' as const,
      header: 'Last Session',
      render: (_value: any, row: OrgMember) =>
        row.last_session_date ? new Date(row.last_session_date).toLocaleDateString() : '—',
    },
    {
      key: 'membership_id' as const,
      header: '',
      render: (_value: any, row: OrgMember) => (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={removingId === row.membership_id}
          onClick={() => handleRemove(row.membership_id)}
        >
          {removingId === row.membership_id ? 'Removing...' : 'Remove'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        align="left"
        variant="light"
        title="Members"
        description="Invite employees and manage who has access to You Matter through your organization."
      />

      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-4 rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              Name
            </label>
            <Input
              type="text"
              placeholder="Jane Doe"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              Email
            </label>
            <Input
              type="email"
              required
              placeholder="employee@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
            Invite as
          </label>
          <div className="flex gap-2">
            <Chip type="button" active={inviteRole === 'member'} onClick={() => setInviteRole('member')}>
              Invite as Member
            </Chip>
            <Chip type="button" active={inviteRole === 'therapist'} onClick={() => setInviteRole('therapist')}>
              Invite as Therapist
            </Chip>
          </div>
          {inviteRole === 'therapist' ? (
            <p className="mt-2 text-xs text-black/50">
              Therapist invites skip the standard credential review — the organization vouches for this
              professional. They&apos;ll add their specialization and license details when they accept.
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={inviting} className="self-start">
          {inviting ? 'Sending...' : 'Send Invite'}
        </Button>
      </form>
      {inviteMessage ? <p className="text-sm font-medium text-green-700">{inviteMessage}</p> : null}
      {inviteError ? <p className="text-sm font-medium text-red-600">{inviteError}</p> : null}

      <div className="flex gap-2">
        <Chip type="button" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
          All
        </Chip>
        <Chip type="button" active={roleFilter === 'member'} onClick={() => setRoleFilter('member')}>
          Members
        </Chip>
        <Chip type="button" active={roleFilter === 'therapist'} onClick={() => setRoleFilter('therapist')}>
          Therapists
        </Chip>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : members.length === 0 ? (
        <div className="rounded-3xl border border-black/20 bg-white p-12 text-center shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
          <p className="text-sm text-black/60">No members yet. Invite your first employee above.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={members} />
      )}
    </div>
  );
}
