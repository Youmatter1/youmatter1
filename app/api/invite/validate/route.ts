import { NextResponse } from 'next/server';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/invite/validate?token=... — public; the token itself is the credential.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    const invitation = await organizationQueries.getInvitationByToken(token) as any;

    if (!invitation) {
      // Narrow down why: not_found / expired / used / org_inactive
      const raw = await organizationQueries.getRawInvitationByToken(token) as any;
      if (!raw) {
        return NextResponse.json({ valid: false, reason: 'not_found' });
      }
      if (raw.accepted_at) {
        return NextResponse.json({ valid: false, reason: 'used' });
      }
      if (new Date(raw.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ valid: false, reason: 'expired' });
      }
      if (!raw.organization_is_active) {
        return NextResponse.json({ valid: false, reason: 'org_inactive' });
      }
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    return NextResponse.json({
      valid: true,
      organization: {
        name: invitation.organization_name,
        logo_url: invitation.organization_logo_url,
        slug: invitation.organization_slug,
      },
      email: invitation.email,
      name: invitation.name,
      org_role: invitation.org_role,
    });
  } catch (error) {
    console.error('GET invite validate error:', error);
    return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 500 });
  }
}
