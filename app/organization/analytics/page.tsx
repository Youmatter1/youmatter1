'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { SectionHeading } from '@/components/ui/section-heading';

interface WeeklyTrendPoint {
  week: string;
  week_start: string | null;
  sessions: number;
  utilization_rate: number;
}

interface AnalyticsData {
  totalMembers: number;
  weeklyTrend: WeeklyTrendPoint[];
}

function formatWeek(weekStart: string | null): string {
  if (!weekStart) return '';
  return new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OrganizationAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organization/analytics', { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load analytics');
        setData(body.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics'))
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
        {error || 'Unable to load analytics.'}
      </div>
    );
  }

  const chartData = data.weeklyTrend.map((point) => ({
    week: formatWeek(point.week_start),
    Sessions: point.sessions,
    'Utilization %': point.utilization_rate,
  }));

  const hasData = chartData.length > 0;

  return (
    <div className="space-y-8">
      <SectionHeading
        align="left"
        variant="light"
        title="Analytics"
        description="Aggregate usage across your organization. Individual member activity and clinical details are never shown here."
      />

      {!hasData ? (
        <div className="rounded-3xl border border-black/20 bg-white p-16 text-center shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
          <p className="text-sm text-black/60">No session activity yet for your organization.</p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
            <h2 className="mb-1 text-base font-semibold text-black">Sessions Over Time</h2>
            <p className="mb-5 text-xs text-black/50">Total sessions booked by all members per week</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Sessions" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)]">
            <h2 className="mb-1 text-base font-semibold text-black">Utilization by Week</h2>
            <p className="mb-5 text-xs text-black/50">
              Share of your {data.totalMembers} member{data.totalMembers === 1 ? '' : 's'} who booked at least one session that week
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Utilization %" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
