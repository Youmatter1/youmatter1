import { NextResponse } from 'next/server';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/organizations/public — minimal public directory of active
// organizations. No auth, no billing/member counts, no internal fields.
export async function GET() {
  try {
    const organizations = await organizationQueries.getPublicOrganizations();
    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error('GET public organizations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
