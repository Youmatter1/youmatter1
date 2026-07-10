import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';
import { validateRequest, updateOrganizationSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

async function resolveOrgAdminMembership(request: Request) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser || !hasRole(currentUser, 'org_admin')) {
    return { error: NextResponse.json({ error: 'Unauthorized. Organization admin access required.' }, { status: 403 }) };
  }

  const membership = await organizationQueries.getMembershipByUserId(currentUser.userId) as any;
  if (!membership || membership.org_role !== 'org_admin') {
    return { error: NextResponse.json({ error: 'Organization not found' }, { status: 404 }) };
  }

  return { organizationId: Number(membership.organization_id) };
}

// GET /api/organization/settings — organization profile
export async function GET(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    const organization = await organizationQueries.getOrganizationById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: organization });
  } catch (error) {
    console.error('GET organization settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/organization/settings — update organization profile
export async function PUT(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    const validation = await validateRequest(request, updateOrganizationSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { name, domain, logo_url, billing_email } = validation.data;

    await organizationQueries.updateOrganization(
      organizationId,
      name ?? null,
      domain ?? null,
      logo_url ?? null,
      billing_email ?? null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT organization settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
