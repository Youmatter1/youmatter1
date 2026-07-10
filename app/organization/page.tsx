'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';

interface DashboardData {
  organization: {
    id: number;
    name: string;
    domain: string | null;
    logo_url: string | null;
    plan_tier: string;
  };
  stats: {
    totalMembers: number;
    activeMembersThisMonth: number;
    sessionsThisMonth: number;
    pendingInvitations: number;
    maxSeats: number;
    seatsRemaining: number;
    utilizationRate: number;
  };
  recentActivity: Array<{
    activity_type: string;
    created_at: string;
    email: string;
    full_name: string | null;
  }>;
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function describeActivity(activityType: string): string {
  switch (activityType) {
    case 'login':
      return 'signed in';
    case 'logout':
      return 'signed out';
    default:
      return activityType.replace(/_/g, ' ');
  }
}

export default function OrganizationDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organization/dashboard', { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load dashboard');
        setData(body.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

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
        {error || 'Something went wrong loading your organization.'}
      </div>
    );
  }

  const { organization, stats, recentActivity } = data;

  return (
    <div className="space-y-8">
      <SectionHeading
        align="left"
        variant="light"
        eyebrow={organization.plan_tier.toUpperCase()}
        title={organization.name}
        description={organization.domain ? `Managing seats for ${organization.domain}` : 'Manage your team\'s access to You Matter'}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Members" value={String(stats.totalMembers)} />
        <StatCard
          label="Active This Month"
          value={String(stats.activeMembersThisMonth)}
          trend={`${stats.utilizationRate}%`}
          trendLabel="utilization"
        />
        <StatCard label="Sessions Used" value={String(stats.sessionsThisMonth)} trendLabel="this month" />
        <StatCard
          label="Seats Remaining"
          value={String(stats.seatsRemaining)}
          trendLabel={`of ${stats.maxSeats} seats`}
        />
      </div>

      {stats.pendingInvitations > 0 ? (
        <div className="rounded-2xl border border-black/10 bg-black/5 px-5 py-4 text-sm font-medium text-black">
          {stats.pendingInvitations} invitation{stats.pendingInvitations === 1 ? '' : 's'} pending acceptance.
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
        <h2 className="mb-4 text-lg font-semibold text-black">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-black/60">No member activity yet.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {recentActivity.map((item, index) => (
              <li key={index} className="flex items-center justify-between py-3 text-sm">
                <span className="text-black">
                  <span className="font-semibold">{item.full_name || item.email}</span>{' '}
                  {describeActivity(item.activity_type)}
                </span>
                <span className="text-black/50">{formatRelativeTime(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
