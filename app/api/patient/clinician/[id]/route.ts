import { NextResponse } from 'next/server';
import { getUserFromRequest, assertSameOrg } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/patient/therapist/[id] - Get therapist profile by ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Therapist ID is required' },
        { status: 400 }
      );
    }

    const currentUser = getUserFromRequest(request);

    const therapistRes = await db.execute({
      sql: `SELECT t.*, u.email, u.is_verified, u.is_active, u.organization_id
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?`,
      args: [parseInt(id)]
    });

    const therapist = therapistRes.rows[0] as any;

    if (!therapist) {
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      );
    }

    if (!assertSameOrg(currentUser?.organization_id ?? null, therapist.organization_id ?? null)) {
      return NextResponse.json(
        { error: 'You do not have access to this therapist profile' },
        { status: 403 }
      );
    }

    // Get reviews for this therapist
    const reviewsRes = await db.execute({
      sql: `SELECT r.*, p.full_name as patient_name
            FROM session_reviews r
            JOIN patients p ON r.patient_id = p.id
            WHERE r.therapist_id = ? AND r.rating IS NOT NULL
            ORDER BY r.created_at DESC
            LIMIT 5`,
      args: [parseInt(id)]
    });

    // Format the response
    const profile = {
      id: therapist.id,
      full_name: therapist.full_name,
      bio: therapist.bio || '',
      specialization: therapist.specialization || 'Mental Health Professional',
      credentials: therapist.license_number ? `License: ${therapist.license_number}` : undefined,
      years_of_experience: therapist.years_of_experience || 0,
      profile_picture: therapist.profile_picture,
      average_rating: therapist.average_rating || 0,
      total_reviews: therapist.total_reviews || 0,
      consultation_fee: therapist.consultation_fee || 80,
      session_types: ['video', 'chat', 'phone'],
      languages: ['English'],
      availability: therapist.is_verified ? 'Available' : 'Pending Verification',
      is_verified: therapist.is_verified || false,
      verification_status: therapist.verification_status,
      email: therapist.email,
      phone: therapist.phone,
      institution_name: therapist.institution_name,
      country: therapist.country,
      mission: therapist.mission,
      recent_reviews: reviewsRes.rows.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.review_text,
        created_at: r.created_at,
        patient_name: r.is_anonymous ? 'Anonymous' : r.patient_name,
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching therapist profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch therapist profile' },
      { status: 500 }
    );
  }
}
