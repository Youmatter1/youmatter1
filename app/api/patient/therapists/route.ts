import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { getUserFromRequest } from '@/lib/auth';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:youmatter.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// GET /api/patient/therapists - Get all therapists.
// Org-bound patients only see their own organization's therapists; independent
// patients see the public marketplace (org-bound therapists excluded).
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);
    const organizationId = currentUser?.organization_id ?? null;

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 100) : null;

    const orgFilter = organizationId ? 'u.organization_id = ?' : 'u.organization_id IS NULL';

    const therapistsRes = await client.execute({
      sql: `SELECT t.*, u.email, u.is_verified, u.is_active
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            WHERE t.verification_status = 'approved' AND u.is_active = 1 AND ${orgFilter}
            ORDER BY t.average_rating DESC${limit ? ' LIMIT ?' : ''}`,
      args: organizationId
        ? (limit ? [organizationId, limit] : [organizationId])
        : (limit ? [limit] : [])
    });

    const therapists = therapistsRes.rows.map((t: any) => ({
      id: t.id,
      full_name: t.full_name,
      specialization: t.specialization || 'Mental Health Professional',
      years_of_experience: t.years_of_experience || 0,
      bio: t.bio || '',
      profile_picture: t.profile_picture,
      average_rating: t.average_rating || 0,
      total_reviews: t.total_reviews || 0,
      consultation_fee: t.consultation_fee || 80,
      is_verified: t.is_verified || false,
      email: t.email,
      phone: t.phone,
      country: t.country,
      institution_name: t.institution_name,
    }));

    return NextResponse.json({
      success: true,
      data: therapists
    });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch therapists' },
      { status: 500 }
    );
  }
}
