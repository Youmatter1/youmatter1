import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TREND_WINDOW_DAYS = 84; // 12 weeks

// GET /api/organization/analytics — anonymized usage trends (counts only, no member names)
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !hasRole(currentUser, 'org_admin')) {
      return NextResponse.json({ error: 'Unauthorized. Organization admin access required.' }, { status: 403 });
    }

    const membership = await organizationQueries.getMembershipByUserId(currentUser.userId) as any;
    if (!membership || membership.org_role !== 'org_admin') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const organizationId = Number(membership.organization_id);

    const [sessionsOverTime, activeMembersOverTime, totalMembersRes] = await Promise.all([
      organizationQueries.getSessionsOverTime(organizationId, TREND_WINDOW_DAYS),
      organizationQueries.getActiveMembersOverTime(organizationId, TREND_WINDOW_DAYS),
      organizationQueries.countMembers(organizationId),
    ]);

    const totalMembers = Number((totalMembersRes as any)?.count || 0);

    // Merge the two weekly series into one, and derive a utilization % per week.
    const activeByWeek = new Map<string, number>(
      (activeMembersOverTime as any[]).map((row) => [String(row.week), Number(row.active_members)])
    );

    const weeklyTrend = (sessionsOverTime as any[]).map((row) => {
      const week = String(row.week);
      const activeMembers = activeByWeek.get(week) ?? 0;
      return {
        week,
        week_start: row.week_start,
        sessions: Number(row.session_count),
        utilization_rate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalMembers,
        weeklyTrend,
      },
    });
  } catch (error) {
    console.error('organization analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
