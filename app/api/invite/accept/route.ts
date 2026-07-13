import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { userQueries, patientQueries, therapistQueries, organizationQueries } from '@/lib/db';
import db from '@/lib/db';
import { validateRequest, acceptInviteSchema } from '@/lib/validation';

function slugifyUsername(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 20) || 'member';
}

async function generateUniqueUsername(name: string): Promise<string> {
  const base = slugifyUsername(name);
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await patientQueries.checkUsernameAvailable(candidate);
    if (!taken) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

// POST /api/invite/accept — public; the token is the credential. Creates the
// user + role-specific profile + organization_members row, then logs them in.
export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request, acceptInviteSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { token, name, password, therapist_profile } = validation.data;

    const invitation = await organizationQueries.getInvitationByToken(token) as any;
    if (!invitation) {
      return NextResponse.json(
        { error: 'This invitation is invalid, expired, or has already been used. Please contact your administrator.' },
        { status: 400 }
      );
    }

    if (invitation.org_role === 'therapist' && !therapist_profile) {
      return NextResponse.json(
        { error: 'Therapist credentials (specialization) are required to accept this invitation.' },
        { status: 400 }
      );
    }

    // Simplification per spec: if an account with this email already exists at
    // all (in this org or another), reject rather than attempting to link
    // accounts. Account linking can be handled later if needed.
    const existingUser = await userQueries.getUserByEmail(invitation.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please contact your administrator.' },
        { status: 409 }
      );
    }

    const organizationId = Number(invitation.organization_id);
    const orgRole = invitation.org_role as 'therapist' | 'member';
    const baseRole = orgRole === 'therapist' ? 'therapist' : 'patient';
    const passwordHash = await hashPassword(password);

    // 1. Create the user, auto-verified and pre-scoped to the org (schema part 1e)
    const userResult = await userQueries.createUser(invitation.email, passwordHash, baseRole, 1, 1);
    let userId = userResult.lastInsertRowid ? Number(userResult.lastInsertRowid) : 0;
    if (!userId) {
      const u = await userQueries.getUserByEmail(invitation.email);
      if (!u) throw new Error('Failed to retrieve created user');
      userId = Number((u as any).id);
    }
    await organizationQueries.setUserOrganization(userId, organizationId);

    // 2. Create the role-specific profile
    if (orgRole === 'therapist' && therapist_profile) {
      await therapistQueries.createTherapist(
        userId,
        name,
        therapist_profile.bio || null,
        therapist_profile.specialization,
        therapist_profile.years_of_experience ?? 0,
        null,
        null,
        therapist_profile.license_number || null,
        null,
        null,
        null,
        null
      );
      // Org-invited therapists are vouched for by the org_admin — skip the
      // platform admin approval queue that independent therapist signups go through.
      await db.execute({
        sql: `UPDATE therapists SET is_verified = 1, verification_status = 'approved' WHERE user_id = ?`,
        args: [userId],
      });
    } else {
      const username = await generateUniqueUsername(name);
      await patientQueries.createPatient(userId, username, name, null, null, null, null);
    }

    // 3. Link them into the org and close out the invitation
    await organizationQueries.createOrgMemberMembership(organizationId, userId, orgRole, invitation.invited_by ?? null);
    await organizationQueries.markInvitationAccepted(invitation.id);

    // 4. Log them in immediately, org-scoped
    const token_ = generateToken({
      userId,
      email: invitation.email,
      role: baseRole,
      is_verified: 1,
      organization_id: organizationId,
      org_role: orgRole,
    });

    const redirectPath = orgRole === 'therapist' ? '/clinician' : '/patient';

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      token: token_,
      redirect: redirectPath,
      user: {
        id: userId,
        email: invitation.email,
        role: baseRole,
        isVerified: 1,
        organization_id: organizationId,
        org_role: orgRole,
      },
    }, { status: 201 });

    response.cookies.set('token', token_, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Invite accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
