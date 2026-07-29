import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries, feedbackQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TREND_WINDOW_DAYS = 84; // 12 weeks

// GET /api/organization/analytics: anonymized usage trends (counts only, no member names)
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

    const [sessionsOverTime, activeMembersOverTime, totalMembersRes, feedbackStatsRes] = await Promise.all([
      organizationQueries.getSessionsOverTime(organizationId, TREND_WINDOW_DAYS),
      organizationQueries.getActiveMembersOverTime(organizationId, TREND_WINDOW_DAYS),
      organizationQueries.countMembers(organizationId),
      feedbackQueries.getAggregateForOrganization(organizationId),
    ]);

    const totalMembers = Number((totalMembersRes as any)?.count || 0);

    // Anonymized: aggregate numbers only, never individual patient names or comments.
    const feedbackStats = feedbackStatsRes as any;
    const totalReviews = Number(feedbackStats?.total_reviews || 0);
    const recommendResponses = Number(feedbackStats?.recommend_responses || 0);
    const satisfaction = {
      averageRating: totalReviews > 0 ? Number(Number(feedbackStats.average_rating).toFixed(1)) : null,
      totalReviews,
      recommendPercent: recommendResponses > 0
        ? Math.round((Number(feedbackStats.recommend_count) / recommendResponses) * 100)
        : null,
    };

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
        satisfaction,
      },
    });
  } catch (error) {
    console.error('organization analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
