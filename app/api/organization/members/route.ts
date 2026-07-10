import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';
import { validateRequest, inviteOrganizationMemberSchema } from '@/lib/validation';
import { inviteOrganizationMember } from '@/lib/organization';

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

  return { membership, organizationId: Number(membership.organization_id) };
}

// GET /api/organization/members — paginated member list with session counts
export async function GET(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const [members, totalRes] = await Promise.all([
      organizationQueries.getMembersPaginated(organizationId, limit, offset),
      organizationQueries.countMembers(organizationId),
    ]);

    const total = Number((totalRes as any)?.count || 0);

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET organization members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/organization/members — invite a new member by email
export async function POST(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { membership, organizationId } = resolved;

    const validation = await validateRequest(request, inviteOrganizationMemberSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { email } = validation.data;

    const result = await inviteOrganizationMember(
      organizationId,
      Number(membership.user_id),
      Number(membership.max_seats || 0),
      email
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { success: true, message: 'Invitation created.', data: { email: result.email, expires_at: result.expiresAt } },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST organization members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
