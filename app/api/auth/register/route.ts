import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { userQueries, patientQueries, therapistQueries, organizationQueries } from '@/lib/db';
import db from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateRequest, registerSchema } from '@/lib/validation';
import { generateUniqueOrgSlug } from '@/lib/organization';

const DOCUMENT_TYPE_MAP = ['government_id', 'professional_license', 'graduate_degree', 'liability_insurance'] as const;

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 attempts per 5 minutes per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(`register:${clientIp}`, {
      interval: 300000, // 5 minutes
      uniqueTokenPerInterval: 3,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
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

    // Validate request body with Zod
    const validation = await validateRequest(request, registerSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const body = validation.data;
    const { email, password, role } = body;

    // Check username availability for patients
    if (role === 'patient' && body.username) {
      const existingUsername = await patientQueries.checkUsernameAvailable(body.username);
      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    // if email already exists
    const existingUser = await userQueries.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Pre-validate therapist payload
    let therapistPayload: { full_name: string; specialization?: string; years_of_experience?: number; bio?: string; phone?: string; license_number?: string; institution_name?: string; country?: string; contact_email?: string; mission?: string; documents?: string[] } | null = null;

    if (role === 'therapist') {
      const {
        full_name,
        specialization,
        years_of_experience,
        bio,
        phone,
        license_number,
        institution_name,
        country,
        contact_email,
        mission,
        documents
      } = body;

      therapistPayload = {
        full_name,
        specialization,
        years_of_experience,
        bio,
        phone,
        license_number,
        institution_name,
        country,
        contact_email,
        mission,
        documents
      };
    }

    // 1. Create User
    const userResult = await userQueries.createUser(
      email,
      passwordHash,
      role,
      (role === 'patient' || role === 'org_admin') ? 1 : 0, // auto-verify patients and org admins (no manual review needed)
      1 // is_active
    );

    let userId = userResult.lastInsertRowid ? Number(userResult.lastInsertRowid) : 0;

    if (!userId) {
      const u = await userQueries.getUserByEmail(email);
      if (!u) throw new Error("Failed to retrieve created user");
      userId = Number((u as any).id);
    }

    // 2. Create Role Specific Profile
    if (role === 'patient') {
      const { username, full_name, date_of_birth, gender, phone } = body;
      await patientQueries.createPatient(
        userId,
        username,
        full_name || null,
        date_of_birth || null,
        gender || null,
        phone || null,
        null
      );
    } else if (role === 'therapist' && therapistPayload) {
      await therapistQueries.createTherapist(
        userId,
        therapistPayload.full_name,
        therapistPayload.bio || null,
        therapistPayload.specialization || null,
        therapistPayload.years_of_experience ?? 0,
        therapistPayload.phone || null,
        null,
        therapistPayload.license_number || null,
        therapistPayload.institution_name || null,
        therapistPayload.country || null,
        therapistPayload.contact_email || null,
        therapistPayload.mission || null
      );

      // Insert therapist documents (get therapist id by user_id)
      const therapist = await therapistQueries.getTherapistByUserId(userId) as any;
      const therapistId = therapist?.id;
      if (therapistId && therapistPayload.documents && therapistPayload.documents.length > 0) {
        for (let i = 0; i < Math.min(therapistPayload.documents.length, DOCUMENT_TYPE_MAP.length); i++) {
          const docUrl = therapistPayload.documents[i];
          const docType = DOCUMENT_TYPE_MAP[i];
          await db.execute({
            sql: `INSERT INTO therapist_documents (therapist_id, document_type, document_url, verified)
                  VALUES (?, ?, ?, ?)`,
            args: [therapistId, docType, docUrl, 0]
          });
        }
      }
    } else if (role === 'org_admin') {
      const { organization_name, domain } = body;
      const slug = await generateUniqueOrgSlug(organization_name);
      const orgResult = await organizationQueries.createOrganization(organization_name, domain || null, email, slug);
      let organizationId = orgResult.lastInsertRowid ? Number(orgResult.lastInsertRowid) : 0;

      if (!organizationId) {
        throw new Error('Failed to retrieve created organization');
      }

      await organizationQueries.createOwnerMembership(organizationId, userId);
    }

    // generating token for all users
    const isAutoVerified = role === 'patient' || role === 'org_admin';
    const token = generateToken({
      userId,
      email,
      role,
      is_verified: isAutoVerified ? 1 : 0,
    });

    const response = NextResponse.json({
      success: true,
      message: isAutoVerified
        ? 'Account created successfully'
        : 'Account created. Pending verification.',
      token,
      user: {
        id: userId,
        email,
        role,
        isVerified: isAutoVerified ? 1 : 0,
      },
    }, { status: 201 });

    // Set httpOnly cookie for API authentication
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
