import crypto from 'crypto';
import { organizationQueries } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

const INVITE_EXPIRY_DAYS = 7;

export type InviteResult =
  | { success: true; email: string; expiresAt: string }
  | { success: false; status: number; error: string };

// Shared by /api/organization/members (POST) and /api/organization/invitations (POST),
// both of which create a pending invitation the same way and email it out.
export async function inviteOrganizationMember(
  organizationId: number,
  invitedByUserId: number,
  maxSeats: number,
  email: string,
  orgRole: 'therapist' | 'member' = 'member',
  name?: string
): Promise<InviteResult> {
  const [seatsUsedRes, pendingRes] = await Promise.all([
    organizationQueries.countSeatsUsed(organizationId),
    organizationQueries.countPendingInvitations(organizationId),
  ]);
  const seatsUsed = Number((seatsUsedRes as any)?.count || 0) + Number((pendingRes as any)?.count || 0);
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
    expiresAt.toISOString(),
    orgRole,
    name || null
  );

  const organization = await organizationQueries.getOrganizationById(organizationId) as any;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const acceptLink = `${appUrl}/invite/accept?token=${token}`;

  // Best-effort — an invite row already exists even if the email fails to send;
  // the org_admin can see it's pending in their dashboard either way.
  try {
    await sendEmail(
      email,
      emailTemplates.organizationInvite({
        recipientName: name || 'there',
        organizationName: organization?.name || 'your organization',
        orgRole,
        acceptLink,
      })
    );
  } catch (err) {
    console.error('Failed to send organization invite email:', err);
  }

  return { success: true, email, expiresAt: expiresAt.toISOString() };
}

// Resolves the seat cap that should gate new invites/members: the active subscription's
// max_seats takes priority, falling back to organizations.max_seats if there's no active
// subscription. Returns Infinity for an unlimited (Enterprise) plan so callers can compare
// with `seatsUsed >= effectiveMaxSeats` without a separate null check.
export async function getEffectiveMaxSeats(organizationId: number, fallbackMaxSeats: number): Promise<number> {
  const subscription = await organizationQueries.getSubscriptionByOrganizationId(organizationId) as any;
  if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
    return subscription.max_seats === null || subscription.max_seats === undefined
      ? Infinity
      : Number(subscription.max_seats);
  }
  return fallbackMaxSeats;
}

// --- Slug generation (schema part 1f) ---

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Appends a random 4-char suffix on collision. Falls back to a fully random
// slug after a few attempts rather than looping forever.
export async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || 'organization';
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await organizationQueries.isSlugTaken(candidate);
    if (!taken) return candidate;
    candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}
