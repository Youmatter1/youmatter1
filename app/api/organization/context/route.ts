import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/organization/context — org branding for the org-context banner on
// the patient/clinician dashboards. Returns { organization: null } for
// independent (non-org) users rather than an error, since it's fine for a
// component to call this unconditionally and just hide the banner.
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !currentUser.organization_id) {
      return NextResponse.json({ organization: null });
    }

    const organization = await organizationQueries.getOrganizationById(currentUser.organization_id) as any;
    if (!organization) {
      return NextResponse.json({ organization: null });
    }

    return NextResponse.json({
      organization: {
        name: organization.name,
        logo_url: organization.logo_url,
        slug: organization.slug,
        primary_color: organization.primary_color || '#4F46E5',
      },
    });
  } catch (error) {
    console.error('GET organization context error:', error);
    return NextResponse.json({ organization: null });
  }
}
