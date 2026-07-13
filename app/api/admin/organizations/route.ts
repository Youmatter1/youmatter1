import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/organizations — list all organizations with member/therapist counts
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const organizations = await organizationQueries.getAllOrganizationsForAdmin();

    return NextResponse.json({ success: true, organizations });
  } catch (error) {
    console.error('Get admin organizations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
