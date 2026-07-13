import { NextResponse } from 'next/server';
import { getUserFromRequest, generateToken } from '@/lib/auth';
import { userQueries, organizationQueries } from '@/lib/db';

export async function POST(request: Request) {
    try {
        // Get current user from token
        const currentUser = getUserFromRequest(request);

        if (!currentUser) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch latest user data from database
        const user = await userQueries.getUserById(currentUser.userId) as any;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const role = (user.role === 'patient' || user.role === 'therapist' || user.role === 'admin' || user.role === 'org_admin')
            ? user.role
            : 'patient';

        // Re-resolve org context fresh (not from the old token) so a removal from
        // an organization takes effect on the very next refresh, not after a
        // full 7-day token expiry.
        let organizationId: number | null = null;
        let orgRole: 'org_admin' | 'therapist' | 'member' | null = null;
        const membership = await organizationQueries.getMembershipByUserId(user.id) as any;
        if (membership) {
            organizationId = Number(membership.organization_id);
            orgRole = membership.org_role;
        }

        // Generate new token with updated subscription status
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role,
            subscription_status: user.subscription_status,
            is_verified: user.is_verified,
            organization_id: organizationId,
            org_role: orgRole,
        });

        // Create response
        const response = NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role,
                isVerified: user.is_verified,
                subscription_status: user.subscription_status,
                organization_id: organizationId,
                org_role: orgRole,
            },
        });

        // Set new httpOnly cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Session refresh error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
