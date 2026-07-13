import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/organization/dashboard — aggregated stats for the org_admin's dashboard
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

    const [
      totalMembersRes,
      totalTherapistsRes,
      activeThisMonthRes,
      sessionsThisMonthRes,
      pendingInvitationsRes,
      seatsUsedRes,
      recentActivity,
    ] = await Promise.all([
      organizationQueries.countMembers(organizationId),
      organizationQueries.countTherapists(organizationId),
      organizationQueries.countActiveMembersThisMonth(organizationId),
      organizationQueries.countSessionsThisMonth(organizationId),
      organizationQueries.countPendingInvitations(organizationId),
      organizationQueries.countSeatsUsed(organizationId),
      organizationQueries.getRecentActivity(organizationId, 10),
    ]);

    const totalMembers = Number((totalMembersRes as any)?.count || 0);
    const totalTherapists = Number((totalTherapistsRes as any)?.count || 0);
    const activeMembersThisMonth = Number((activeThisMonthRes as any)?.count || 0);
    const sessionsThisMonth = Number((sessionsThisMonthRes as any)?.count || 0);
    const pendingInvitations = Number((pendingInvitationsRes as any)?.count || 0);
    const seatsUsed = Number((seatsUsedRes as any)?.count || 0);
    const maxSeats = Number(membership.max_seats || 0);
    const utilizationRate = totalMembers > 0 ? Math.round((activeMembersThisMonth / totalMembers) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organizationId,
          name: membership.organization_name,
          domain: membership.domain,
          logo_url: membership.logo_url,
          plan_tier: membership.plan_tier,
        },
        stats: {
          totalMembers,
          totalTherapists,
          activeMembersThisMonth,
          sessionsThisMonth,
          pendingInvitations,
          maxSeats,
          seatsUsed,
          seatsRemaining: Math.max(maxSeats - seatsUsed, 0),
          utilizationRate,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('organization dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
