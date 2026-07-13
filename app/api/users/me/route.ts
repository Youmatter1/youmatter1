import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { userQueries, patientQueries, therapistQueries, systemAdminQueries, organizationQueries } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Authenticate user
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile based on role
    let profile = null;

    switch (currentUser.role) {
      case 'patient':
        profile = await patientQueries.getPatientByUserId(currentUser.userId);
        break;
      case 'therapist':
        profile = await therapistQueries.getTherapistByUserId(currentUser.userId);
        break;
      case 'admin':
        profile = await systemAdminQueries.getAdminByUserId(currentUser.userId);
        break;
    }

    // Re-resolve org context fresh from the DB (not the token) on every profile
    // fetch, so the org context banner and scoping reflect removal from an org
    // immediately rather than waiting out the token's 7-day expiry.
    const membership = await organizationQueries.getMembershipByUserId(currentUser.userId) as any;
    const organization_id = membership ? Number(membership.organization_id) : null;
    const org_role = membership ? membership.org_role : null;

    if (!profile) {
      // Return user info without profile if profile doesn't exist yet
      // This allows login to succeed even if profile is not fully set up
      return NextResponse.json({
        success: true,
        user: {
          userId: currentUser.userId,
          email: currentUser.email,
          role: currentUser.role,
          profile: null,
          organization_id,
          org_role,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: currentUser.userId,
        email: currentUser.email,
        role: currentUser.role,
        profile,
        organization_id,
        org_role,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Authenticate user
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updates = await request.json();

    // Update based on role
    switch (currentUser.role) {
      case 'patient': {
        const currentProfile = await patientQueries.getPatientByUserId(currentUser.userId) as any;

        const newUsername = updates.username || currentProfile?.username;
        if (updates.username && updates.username !== currentProfile?.username) {
          const existing = await patientQueries.checkUsernameAvailable(updates.username) as any;
          if (existing && existing.id !== currentProfile?.id) {
            return NextResponse.json(
              { error: 'Username already taken' },
              { status: 409 }
            );
          }
        }

        await patientQueries.updatePatient(
          newUsername,
          updates.full_name !== undefined ? updates.full_name : currentProfile?.full_name ?? null,
          updates.date_of_birth !== undefined ? updates.date_of_birth : currentProfile?.date_of_birth ?? null,
          updates.gender !== undefined ? updates.gender : currentProfile?.gender ?? null,
          updates.phone !== undefined ? updates.phone : currentProfile?.phone ?? null,
          currentProfile?.profile_picture ?? null,
          updates.bio !== undefined ? updates.bio : currentProfile?.bio ?? null,
          currentUser.userId
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Profile updates not implemented for this role' },
          { status: 501 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
