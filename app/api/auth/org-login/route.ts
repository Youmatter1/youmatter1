import { NextResponse } from 'next/server';
import { comparePassword, generateToken } from '@/lib/auth';
import { userQueries, organizationQueries, activityQueries } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateRequest, orgLoginSchema } from '@/lib/validation';

// POST /api/auth/org-login — email + password + org slug. Unlike the main
// login, this also requires the account to actually be a member of the org
// named by `slug` — otherwise it's rejected even if the credentials are valid.
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(`org-login:${clientIp}`, {
      interval: 60000,
      uniqueTokenPerInterval: 5,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      );
    }

    const validation = await validateRequest(request, orgLoginSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { email, password, slug } = validation.data;

    const organization = await organizationQueries.getOrganizationBySlug(slug) as any;
    if (!organization || !organization.is_active) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    const user = await userQueries.getUserByEmail(email) as any;
    if (!user) {
      return NextResponse.json(
        { error: 'No account found. Please check your email or contact your administrator for an invitation.' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is inactive.' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'No account found. Please check your email or contact your administrator for an invitation.' },
        { status: 401 }
      );
    }

    const membership = await organizationQueries.getMembershipByUserId(user.id) as any;
    if (!membership || Number(membership.organization_id) !== Number(organization.id)) {
      return NextResponse.json(
        { error: `This account is not registered with ${organization.name}. Please contact your administrator.` },
        { status: 403 }
      );
    }

    const role = (user.role === 'patient' || user.role === 'therapist' || user.role === 'admin' || user.role === 'org_admin')
      ? user.role
      : 'patient';

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role,
      subscription_status: user.subscription_status,
      is_verified: user.is_verified,
      organization_id: Number(organization.id),
      org_role: membership.org_role,
    });

    try {
      await activityQueries.logActivity(user.id, 'login', JSON.stringify({ timestamp: new Date().toISOString(), via: 'org-login', slug }));
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    const redirectMap: Record<string, string> = {
      therapist: '/clinician',
      member: '/patient',
      org_admin: '/organization',
    };
    const redirectPath = redirectMap[membership.org_role] || '/';

    const response = NextResponse.json({
      success: true,
      token,
      redirect: redirectPath,
      user: {
        id: user.id,
        email: user.email,
        role,
        isVerified: user.is_verified,
        subscription_status: user.subscription_status,
        organization_id: Number(organization.id),
        org_role: membership.org_role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Org login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
