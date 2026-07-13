import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { activityQueries } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateRequest, loginSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(`login:${clientIp}`, {
      interval: 60000, // 1 minute
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

    // Validate request body
    const validation = await validateRequest(request, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const { email, password, role } = validation.data;

    // authenticate user
    const result = await authenticateUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }

    // If the sign-in screen's account-type picker was used, enforce it as a real
    // boundary: this account must actually be that type, not just any valid login.
    if (role && result.user!.role !== role) {
      const roleLabels: Record<string, string> = {
        patient: 'Patient / Client',
        therapist: 'Licensed Therapist',
        org_admin: 'Organization',
        admin: 'Administrator',
      };
      const actualLabel = roleLabels[result.user!.role] || result.user!.role;
      const selectedLabel = roleLabels[role] || role;
      return NextResponse.json(
        { error: `This account is registered as ${actualLabel}, not ${selectedLabel}. Go back and choose the correct account type to sign in.` },
        { status: 403 }
      );
    }

    try {
      await activityQueries.logActivity(
        result.user!.id,
        'login',
        JSON.stringify({ timestamp: new Date().toISOString() })
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });

    // Set httpOnly cookie for API authentication
    if (result.token) {
      response.cookies.set('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days to match JWT expiration
        path: '/',
      });
    }

    console.log("I am in")
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
