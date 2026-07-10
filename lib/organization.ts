import crypto from 'crypto';
import { organizationQueries } from '@/lib/db';

const INVITE_EXPIRY_DAYS = 7;

export type InviteResult =
  | { success: true; email: string; expiresAt: string }
  | { success: false; status: number; error: string };

// Shared by /api/organization/members (POST) and /api/organization/invitations (POST),
// both of which create a pending invitation the same way.
export async function inviteOrganizationMember(
  organizationId: number,
  invitedByUserId: number,
  maxSeats: number,
  email: string
): Promise<InviteResult> {
  const [totalRes, pendingRes] = await Promise.all([
    organizationQueries.countMembers(organizationId),
    organizationQueries.countPendingInvitations(organizationId),
  ]);
  const seatsUsed = Number((totalRes as any)?.count || 0) + Number((pendingRes as any)?.count || 0);
  if (seatsUsed >= maxSeats) {
    return { success: false, status: 409, error: 'No seats remaining. Upgrade your plan or remove inactive members.' };
  }

  const existingMember = await organizationQueries.findExistingMemberByEmail(organizationId, email);
  if (existingMember) {
    return { success: false, status: 409, error: 'This person is already a member of your organization.' };
  }

  const existingInvitation = await organizationQueries.findPendingInvitationByEmail(organizationId, email);
  if (existingInvitation) {
    return { success: false, status: 409, error: 'An invitation is already pending for this email.' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  await organizationQueries.createInvitation(
    organizationId,
    email,
    token,
    invitedByUserId,
    expiresAt.toISOString()
  );

  return { success: true, email, expiresAt: expiresAt.toISOString() };
}
