
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

// Only allow same-app relative paths through — never an absolute/external URL
// (this value round-trips through an email link into a client-side redirect).
function sanitizeRedirect(redirect: unknown): string | undefined {
    if (typeof redirect !== 'string') return undefined;
    if (!redirect.startsWith('/') || redirect.startsWith('//')) return undefined;
    return redirect;
}

export async function POST(request: Request) {
    try {
        const { email, redirect } = await request.json();
        const redirectPath = sanitizeRedirect(redirect);

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const userRes = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        const user = userRes.rows[0] as unknown as { id: number } | undefined;

        if (!user) {
            // Do not reveal if user exists
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.'
            });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

        // Store token
        await db.execute({
            sql: `INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (?, ?, ?)`,
            args: [user.id, token, expiresAt.toISOString()]
        });

        // Send email
        const emailResult = await sendPasswordResetEmail(email, token, redirectPath);

        if (!emailResult.success) {
            // Clean up the token we just inserted so the user can try again
            await db.execute({
                sql: 'DELETE FROM password_resets WHERE token = ?',
                args: [token]
            });
            console.error('Password reset email failed to send:', emailResult.error);
            return NextResponse.json(
                { error: 'Failed to send reset email. Please try again later.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
