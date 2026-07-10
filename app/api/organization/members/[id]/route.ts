import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/organization/members/[id] — remove a member from the organization
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const membershipRow = await organizationQueries.getMembershipRowById(organizationId, Number(id));
    if (!membershipRow) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await organizationQueries.removeMember(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE organization member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
