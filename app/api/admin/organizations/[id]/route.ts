import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/organizations/[id] — organization detail + full member list
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const detail = await organizationQueries.getOrganizationAdminDetail(parseInt(id));
    if (!detail) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...detail });
  } catch (error) {
    console.error('Get admin organization detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/[id] — permanently deletes the organization
// and everything tied to it (members, invitations, org-bound therapist/member
// accounts, their sessions, messages, files). Irreversible.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const organizationId = parseInt(id);

    const organization = await organizationQueries.getOrganizationById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await organizationQueries.deleteOrganizationCascade(organizationId);

    return NextResponse.json({ success: true, message: `${(organization as any).name} has been permanently deleted.` });
  } catch (error) {
    console.error('Delete admin organization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
