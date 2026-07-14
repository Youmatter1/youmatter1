import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/organization/invitations/[id] — cancel a pending invitation so
// the same email can be re-invited (e.g. after a broken link, wrong role, etc).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !hasRole(currentUser, 'org_admin')) {
      return NextResponse.json({ error: 'Unauthorized. Organization admin access required.' }, { status: 403 });
    }

    const membership = await organizationQueries.getMembershipByUserId(currentUser.userId) as any;
    if (!membership || membership.org_role !== 'org_admin') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { id } = await params;
    const cancelled = await organizationQueries.cancelInvitation(Number(membership.organization_id), Number(id));

    if (!cancelled) {
      return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Invitation cancelled.' });
  } catch (error) {
    console.error('DELETE organization invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
