import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create client
const url = process.env.TURSO_DATABASE_URL || 'file:youmatter.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const rawClient: Client = createClient({
  url,
  authToken,
});

// Retry wrapper
const client = {
  ...rawClient,
  execute: async (stmt: any) => {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        return await rawClient.execute(stmt);
      } catch (error: any) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        console.warn(`DB execute failed (attempt ${attempts}/${maxAttempts}), retrying...`, error.message);
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    throw new Error("DB Retry failed"); // Should be unreachable
  }
};

export default client;

// --- User Queries ---
export const userQueries = {
  getUserByEmail: async (email: string) => {
    const rs = await client.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    return rs.rows[0];
  },

  getUserById: async (id: number | string) => {
    const rs = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
    return rs.rows[0];
  },

  createUser: async (email: string, passwordHash: string, role: string, isVerified: number, isActive: number) => {
    const rs = await client.execute({
      sql: 'INSERT INTO users (email, password_hash, role, is_verified, is_active) VALUES (?, ?, ?, ?, ?)',
      args: [email, passwordHash, role, isVerified, isActive]
    });
    return rs;
  },

  updateUser: async (email: string, role: string, isVerified: number, isActive: number, id: number | string) => {
    const rs = await client.execute({
      sql: `UPDATE users 
            SET email = ?, role = ?, is_verified = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [email, role, isVerified, isActive, id]
    });
    return rs;
  },

  deleteUser: async (id: number | string) => {
    return await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
  },

  getUsersByRole: async (role: string) => {
    const rs = await client.execute({ sql: 'SELECT * FROM users WHERE role = ?', args: [role] });
    return rs.rows;
  },

  getAllUsers: async (limit: number, offset: number) => {
    const rs = await client.execute({
      sql: 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [limit, offset]
    });
    return rs.rows;
  },

  countUsersByRole: async (role: string) => {
    const rs = await client.execute({ sql: 'SELECT COUNT(*) as count FROM users WHERE role = ?', args: [role] });
    return rs.rows[0];
  },
};

// --- Patient Queries ---
export const patientQueries = {
  getPatientByUserId: async (userId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT p.*, u.email, u.is_verified, u.is_active, u.created_at
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?`,
      args: [userId]
    });
    return rs.rows[0];
  },

  getPatientByUsername: async (username: string) => {
    const rs = await client.execute({
      sql: `SELECT p.*, u.email, u.is_verified, u.is_active, u.created_at
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.username = ?`,
      args: [username]
    });
    return rs.rows[0];
  },

  createPatient: async (
    userId: number | string,
    username: string,
    fullName: string | null,
    dob: string | null,
    gender: string | null,
    phone: string | null,
    profilePicture: string | null
  ) => {
    return await client.execute({
      sql: `INSERT INTO patients (user_id, username, full_name, date_of_birth, gender, phone, profile_picture)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, username, fullName || username, dob, gender, phone, profilePicture]
    });
  },

  updatePatient: async (
    username: string,
    fullName: string | null,
    dob: string | null,
    gender: string | null,
    phone: string | null,
    profilePicture: string | null,
    bio: string | null,
    userId: number | string
  ) => {
    return await client.execute({
      sql: `UPDATE patients
            SET username = ?, full_name = ?, date_of_birth = ?, gender = ?, phone = ?, profile_picture = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?`,
      args: [username, fullName, dob, gender, phone, profilePicture, bio, userId]
    });
  },

  checkUsernameAvailable: async (username: string) => {
    const rs = await client.execute({ sql: 'SELECT id FROM patients WHERE username = ?', args: [username] });
    return rs.rows[0];
  },
};

// --- Therapist Queries ---
export const therapistQueries = {
  getTherapistByUserId: async (userId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT t.*, u.email, u.is_verified, u.is_active
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = ?`,
      args: [userId]
    });
    return rs.rows[0];
  },

  getTherapistById: async (id: number | string) => {
    const rs = await client.execute({
      sql: `SELECT t.*, u.email
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?`,
      args: [id]
    });
    return rs.rows[0];
  },

  getAllTherapists: async () => {
    const rs = await client.execute({
      sql: `SELECT t.*, u.email
            FROM therapists t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.full_name`,
      args: []
    });
    return rs.rows;
  },

  createTherapist: async (
    userId: number | string,
    fullName: string,
    bio: string | null,
    specialization: string | null,
    yearsOfExperience: number | string | null,
    phone: string | null,
    profilePicture: string | null,
    licenseNumber: string | null,
    institutionName: string | null,
    country: string | null,
    contactEmail: string | null,
    mission: string | null
  ) => {
    return await client.execute({
      sql: `INSERT INTO therapists (user_id, full_name, bio, specialization, years_of_experience, phone, profile_picture, license_number, institution_name, country, contact_email, mission)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId, fullName, bio, specialization, yearsOfExperience, phone, profilePicture,
        licenseNumber, institutionName, country, contactEmail, mission
      ]
    });
  },

  updateTherapist: async (
    fullName: string,
    bio: string | null,
    specialization: string | null,
    yearsOfExperience: number | string | null,
    phone: string | null,
    profilePicture: string | null,
    userId: number | string
  ) => {
    return await client.execute({
      sql: `UPDATE therapists 
            SET full_name = ?, bio = ?, specialization = ?, years_of_experience = ?, phone = ?, profile_picture = ?
            WHERE user_id = ?`,
      args: [fullName, bio, specialization, yearsOfExperience, phone, profilePicture, userId]
    });
  },
};

// Backward compatibility alias
export const professionalQueries = therapistQueries;

// --- Institutional Admin Queries (Deprecated) ---
export const institutionalAdminQueries = {
  getAdminByUserId: async () => null,
  createInstitutionalAdmin: async () => null,
  getAdminsByInstitution: async () => [],
};

// --- System Admin Queries ---
export const systemAdminQueries = {
  getAdminByUserId: async (userId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT a.*, u.email
            FROM admins a
            JOIN users u ON a.user_id = u.id
            WHERE a.user_id = ?`,
      args: [userId]
    });
    return rs.rows[0];
  },

  createSystemAdmin: async (userId: number | string, fullName: string, phone: string | null) => {
    return await client.execute({
      sql: `INSERT INTO admins (user_id, full_name, phone)
            VALUES (?, ?, ?)`,
      args: [userId, fullName, phone]
    });
  },

  getAllSystemAdmins: async () => {
    const rs = await client.execute({
      sql: `SELECT a.*, u.email, u.is_active
            FROM admins a
            JOIN users u ON a.user_id = u.id`,
      args: []
    });
    return rs.rows;
  },
};

// --- Activity Queries ---
export const activityQueries = {
  logActivity: async (userId: number | string, activityType: string, details: string) => {
    return await client.execute({
      sql: `INSERT INTO user_activity (user_id, activity_type, details)
            VALUES (?, ?, ?)`,
      args: [userId, activityType, details]
    });
  },

  getRecentActivities: async (limit: number, offset: number) => {
    const rs = await client.execute({
      sql: `SELECT ua.*, u.email
            FROM user_activity ua
            JOIN users u ON ua.user_id = u.id
            ORDER BY ua.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset]
    });
    return rs.rows;
  },

  getUserGrowthStats: async () => {
    const rs = await client.execute({
      sql: `SELECT 
              role,
              DATE(created_at) as date,
              COUNT(*) as count
            FROM users
            WHERE created_at >= date('now', '-30 days')
            GROUP BY role, DATE(created_at)
            ORDER BY date DESC`,
      args: []
    });
    return rs.rows;
  },
};

// --- Organization Queries (B2B) ---
export const organizationQueries = {
  // Resolves the org + membership row for a given user (used to gate org_admin routes)
  getMembershipByUserId: async (userId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT om.*, o.name as organization_name, o.domain, o.logo_url,
                   o.plan_tier, o.billing_email, o.max_seats, o.is_active as organization_is_active
            FROM organization_members om
            JOIN organizations o ON om.organization_id = o.id
            WHERE om.user_id = ? AND om.is_active = 1`,
      args: [userId]
    });
    return rs.rows[0];
  },

  createOrganization: async (name: string, domain: string | null, billingEmail: string | null, slug: string) => {
    return await client.execute({
      sql: `INSERT INTO organizations (name, domain, billing_email, slug) VALUES (?, ?, ?, ?)`,
      args: [name, domain, billingEmail, slug]
    });
  },

  getOrganizationBySlug: async (slug: string) => {
    const rs = await client.execute({
      sql: 'SELECT * FROM organizations WHERE slug = ?',
      args: [slug]
    });
    return rs.rows[0];
  },

  isSlugTaken: async (slug: string) => {
    const rs = await client.execute({
      sql: 'SELECT id FROM organizations WHERE slug = ?',
      args: [slug]
    });
    return !!rs.rows[0];
  },

  createOwnerMembership: async (organizationId: number | string, userId: number | string) => {
    return await client.execute({
      sql: `INSERT INTO organization_members (organization_id, user_id, org_role, joined_at, is_active)
            VALUES (?, ?, 'org_admin', CURRENT_TIMESTAMP, 1)`,
      args: [organizationId, userId]
    });
  },

  // Public org directory — deliberately minimal fields only (no billing info,
  // member counts, or anything internal).
  getPublicOrganizations: async () => {
    const rs = await client.execute({
      sql: `SELECT id, name, slug, logo_url FROM organizations WHERE is_active = 1 AND slug IS NOT NULL ORDER BY name ASC`,
      args: []
    });
    return rs.rows;
  },

  getOrganizationById: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: 'SELECT * FROM organizations WHERE id = ?',
      args: [organizationId]
    });
    return rs.rows[0];
  },

  updateOrganization: async (
    organizationId: number | string,
    name: string | null,
    domain: string | null,
    logoUrl: string | null,
    billingEmail: string | null
  ) => {
    return await client.execute({
      sql: `UPDATE organizations
            SET name = COALESCE(?, name),
                domain = COALESCE(?, domain),
                logo_url = COALESCE(?, logo_url),
                billing_email = COALESCE(?, billing_email),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [name, domain, logoUrl, billingEmail, organizationId]
    });
  },

  countMembers: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(*) as count FROM organization_members
            WHERE organization_id = ? AND org_role = 'member' AND is_active = 1`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  countTherapists: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(*) as count FROM organization_members
            WHERE organization_id = ? AND org_role = 'therapist' AND is_active = 1`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  // Seats are consumed by therapists and members alike; org_admins don't count.
  countSeatsUsed: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(*) as count FROM organization_members
            WHERE organization_id = ? AND org_role IN ('therapist', 'member') AND is_active = 1`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  countActiveMembersThisMonth: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(DISTINCT om.user_id) as count
            FROM organization_members om
            JOIN patients p ON p.user_id = om.user_id
            JOIN sessions s ON s.patient_id = p.id
            WHERE om.organization_id = ? AND om.org_role = 'member' AND om.is_active = 1
              AND strftime('%Y-%m', s.scheduled_date) = strftime('%Y-%m', 'now')`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  countSessionsThisMonth: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(s.id) as count
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            JOIN organization_members om ON om.user_id = p.user_id
            WHERE om.organization_id = ? AND om.org_role = 'member' AND om.is_active = 1
              AND strftime('%Y-%m', s.scheduled_date) = strftime('%Y-%m', 'now')`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  countPendingInvitations: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT COUNT(*) as count FROM organization_invitations
            WHERE organization_id = ? AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  // Scoped to organizationId so one org's admin can't cancel another org's
  // invitation by guessing an id. Only cancels if it's still pending
  // (unaccepted) — a bad token is otherwise harmless to try to delete.
  cancelInvitation: async (organizationId: number | string, invitationId: number | string) => {
    const rs = await client.execute({
      sql: `DELETE FROM organization_invitations
            WHERE id = ? AND organization_id = ? AND accepted_at IS NULL`,
      args: [invitationId, organizationId]
    });
    return rs.rowsAffected > 0;
  },

  // roleFilter: 'member' | 'therapist' | undefined (both). Resolves the display
  // name/picture/session-count from patients or therapists depending on each
  // row's own org_role, since a member's profile lives in one table and a
  // therapist's in the other.
  getMembersPaginated: async (
    organizationId: number | string,
    limit: number,
    offset: number,
    roleFilter?: 'member' | 'therapist'
  ) => {
    const rs = await client.execute({
      sql: `SELECT
              om.id as membership_id,
              om.user_id,
              om.org_role,
              om.is_active,
              om.invited_at,
              om.joined_at,
              u.email,
              COALESCE(p.full_name, t.full_name) as full_name,
              COALESCE(p.profile_picture, t.profile_picture) as profile_picture,
              COUNT(DISTINCT s.id) as session_count,
              MAX(s.scheduled_date) as last_session_date
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            LEFT JOIN patients p ON p.user_id = om.user_id AND om.org_role = 'member'
            LEFT JOIN therapists t ON t.user_id = om.user_id AND om.org_role = 'therapist'
            LEFT JOIN sessions s ON (
              (om.org_role = 'member' AND s.patient_id = p.id) OR
              (om.org_role = 'therapist' AND s.therapist_id = t.id)
            )
            WHERE om.organization_id = ?
              AND om.org_role IN ('therapist', 'member')
              ${roleFilter ? 'AND om.org_role = ?' : ''}
            GROUP BY om.id
            ORDER BY COALESCE(om.joined_at, om.invited_at) DESC
            LIMIT ? OFFSET ?`,
      args: roleFilter
        ? [organizationId, roleFilter, limit, offset]
        : [organizationId, limit, offset]
    });
    return rs.rows;
  },

  // Pagination total matching the same filter as getMembersPaginated.
  countOrgUsers: async (organizationId: number | string, roleFilter?: 'member' | 'therapist') => {
    const rs = await client.execute({
      sql: `SELECT COUNT(*) as count FROM organization_members
            WHERE organization_id = ?
              AND org_role IN ('therapist', 'member')
              ${roleFilter ? 'AND org_role = ?' : ''}`,
      args: roleFilter ? [organizationId, roleFilter] : [organizationId]
    });
    return rs.rows[0];
  },

  getMembershipRowById: async (organizationId: number | string, membershipId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT id, org_role FROM organization_members
            WHERE id = ? AND organization_id = ? AND org_role IN ('therapist', 'member')`,
      args: [membershipId, organizationId]
    });
    return rs.rows[0];
  },

  removeMember: async (membershipId: number | string) => {
    return await client.execute({
      sql: 'DELETE FROM organization_members WHERE id = ?',
      args: [membershipId]
    });
  },

  findExistingMemberByEmail: async (organizationId: number | string, email: string) => {
    const rs = await client.execute({
      sql: `SELECT om.id FROM organization_members om
            JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = ? AND u.email = ? AND om.org_role IN ('therapist', 'member')`,
      args: [organizationId, email]
    });
    return rs.rows[0];
  },

  findPendingInvitationByEmail: async (organizationId: number | string, email: string) => {
    const rs = await client.execute({
      sql: `SELECT id FROM organization_invitations
            WHERE organization_id = ? AND email = ? AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      args: [organizationId, email]
    });
    return rs.rows[0];
  },

  createInvitation: async (
    organizationId: number | string,
    email: string,
    token: string,
    invitedBy: number | string,
    expiresAt: string,
    orgRole: 'therapist' | 'member' = 'member',
    name: string | null = null
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_invitations (organization_id, email, token, invited_by, expires_at, org_role, name)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [organizationId, email, token, invitedBy, expiresAt, orgRole, name]
    });
  },

  getPendingInvitations: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT oi.id, oi.email, oi.name, oi.org_role, oi.expires_at, oi.created_at, u.email as invited_by_email
            FROM organization_invitations oi
            LEFT JOIN users u ON oi.invited_by = u.id
            WHERE oi.organization_id = ? AND oi.accepted_at IS NULL AND oi.expires_at > CURRENT_TIMESTAMP
            ORDER BY oi.created_at DESC`,
      args: [organizationId]
    });
    return rs.rows;
  },

  // Looks up an invitation by its raw token, joined with the organization it
  // belongs to — used by the public /invite/accept flow, where the token
  // itself is the only credential. Only returns invitations that are still
  // valid: not expired, not already accepted, and the org is still active.
  getInvitationByToken: async (token: string) => {
    const rs = await client.execute({
      sql: `SELECT oi.*, o.name as organization_name, o.logo_url as organization_logo_url,
                   o.slug as organization_slug, o.is_active as organization_is_active
            FROM organization_invitations oi
            JOIN organizations o ON oi.organization_id = o.id
            WHERE oi.token = ?
              AND oi.accepted_at IS NULL
              AND oi.expires_at > CURRENT_TIMESTAMP
              AND o.is_active = 1`,
      args: [token]
    });
    return rs.rows[0];
  },

  // Unfiltered lookup (unlike getInvitationByToken) so callers can tell apart
  // "not found" from "expired"/"used"/"org inactive" for a specific error message.
  getRawInvitationByToken: async (token: string) => {
    const rs = await client.execute({
      sql: `SELECT oi.*, o.is_active as organization_is_active
            FROM organization_invitations oi
            JOIN organizations o ON oi.organization_id = o.id
            WHERE oi.token = ?`,
      args: [token]
    });
    return rs.rows[0];
  },

  markInvitationAccepted: async (invitationId: number | string) => {
    return await client.execute({
      sql: `UPDATE organization_invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [invitationId]
    });
  },

  // Generalized version of createOwnerMembership for invite-accept: sets
  // joined_at (the user has actually joined, not just been invited) and
  // records who invited them.
  createOrgMemberMembership: async (
    organizationId: number | string,
    userId: number | string,
    orgRole: 'therapist' | 'member',
    invitedBy: number | string | null
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_members (organization_id, user_id, org_role, invited_by, invited_at, joined_at, is_active)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
      args: [organizationId, userId, orgRole, invitedBy]
    });
  },

  // Denormalized shortcut (schema part 1e) — set once during invite-accept.
  setUserOrganization: async (userId: number | string, organizationId: number | string) => {
    return await client.execute({
      sql: `UPDATE users SET organization_id = ? WHERE id = ?`,
      args: [organizationId, userId]
    });
  },

  // Non-clinical activity feed (login/logout etc.) scoped to this org's members
  getRecentActivity: async (organizationId: number | string, limit: number) => {
    const rs = await client.execute({
      sql: `SELECT ua.activity_type, ua.created_at, u.email, p.full_name
            FROM user_activity ua
            JOIN organization_members om ON om.user_id = ua.user_id
            JOIN users u ON u.id = ua.user_id
            LEFT JOIN patients p ON p.user_id = ua.user_id
            WHERE om.organization_id = ? AND om.org_role = 'member'
            ORDER BY ua.created_at DESC
            LIMIT ?`,
      args: [organizationId, limit]
    });
    return rs.rows;
  },

  // Anonymized weekly session volume for the usage-trend chart (counts only, no names)
  getSessionsOverTime: async (organizationId: number | string, days: number) => {
    const rs = await client.execute({
      sql: `SELECT strftime('%Y-%W', s.scheduled_date) as week,
                   MIN(s.scheduled_date) as week_start,
                   COUNT(s.id) as session_count
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            JOIN organization_members om ON om.user_id = p.user_id
            WHERE om.organization_id = ? AND om.org_role = 'member'
              AND s.scheduled_date >= date('now', '-' || ? || ' days')
            GROUP BY week
            ORDER BY week ASC`,
      args: [organizationId, days]
    });
    return rs.rows;
  },

  // Anonymized weekly utilization: distinct members with >=1 session that week
  getActiveMembersOverTime: async (organizationId: number | string, days: number) => {
    const rs = await client.execute({
      sql: `SELECT strftime('%Y-%W', s.scheduled_date) as week,
                   COUNT(DISTINCT p.user_id) as active_members
            FROM sessions s
            JOIN patients p ON s.patient_id = p.id
            JOIN organization_members om ON om.user_id = p.user_id
            WHERE om.organization_id = ? AND om.org_role = 'member'
              AND s.scheduled_date >= date('now', '-' || ? || ' days')
            GROUP BY week
            ORDER BY week ASC`,
      args: [organizationId, days]
    });
    return rs.rows;
  },

  // --- Subscriptions / billing ---

  createSubscription: async (
    organizationId: number | string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    planTier: string,
    pricePerSeat: number,
    maxSeats: number | null,
    billingCycle: string,
    status: string,
    currentPeriodStart: string | null,
    currentPeriodEnd: string | null
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_subscriptions
              (organization_id, stripe_subscription_id, stripe_customer_id, plan_tier, price_per_seat, max_seats, billing_cycle, status, current_period_start, current_period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [organizationId, stripeSubscriptionId, stripeCustomerId, planTier, pricePerSeat, maxSeats, billingCycle, status, currentPeriodStart, currentPeriodEnd]
    });
  },

  // Most recent subscription row for the org (there may be a history of canceled ones)
  getSubscriptionByOrganizationId: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT * FROM organization_subscriptions
            WHERE organization_id = ?
            ORDER BY created_at DESC
            LIMIT 1`,
      args: [organizationId]
    });
    return rs.rows[0];
  },

  getSubscriptionByStripeId: async (stripeSubscriptionId: string) => {
    const rs = await client.execute({
      sql: 'SELECT * FROM organization_subscriptions WHERE stripe_subscription_id = ?',
      args: [stripeSubscriptionId]
    });
    return rs.rows[0];
  },

  updateSubscription: async (
    stripeSubscriptionId: string,
    planTier: string | null,
    pricePerSeat: number | null,
    maxSeats: number | null,
    billingCycle: string | null,
    status: string | null,
    currentPeriodStart: string | null,
    currentPeriodEnd: string | null,
    cancelAtPeriodEnd: number | null
  ) => {
    return await client.execute({
      sql: `UPDATE organization_subscriptions
            SET plan_tier = COALESCE(?, plan_tier),
                price_per_seat = COALESCE(?, price_per_seat),
                max_seats = COALESCE(?, max_seats),
                billing_cycle = COALESCE(?, billing_cycle),
                status = COALESCE(?, status),
                current_period_start = COALESCE(?, current_period_start),
                current_period_end = COALESCE(?, current_period_end),
                cancel_at_period_end = COALESCE(?, cancel_at_period_end),
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?`,
      args: [planTier, pricePerSeat, maxSeats, billingCycle, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, stripeSubscriptionId]
    });
  },

  getInvoices: async (organizationId: number | string, limit: number, offset: number) => {
    const rs = await client.execute({
      sql: `SELECT * FROM organization_invoices
            WHERE organization_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
      args: [organizationId, limit, offset]
    });
    return rs.rows;
  },

  countInvoices: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM organization_invoices WHERE organization_id = ?',
      args: [organizationId]
    });
    return rs.rows[0];
  },

  createInvoice: async (
    organizationId: number | string,
    stripeInvoiceId: string,
    amountPaid: number,
    seatsBilled: number | null,
    periodStart: string | null,
    periodEnd: string | null,
    status: string,
    invoicePdfUrl: string | null
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_invoices
              (organization_id, stripe_invoice_id, amount_paid, seats_billed, period_start, period_end, status, invoice_pdf_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(stripe_invoice_id) DO UPDATE SET
              amount_paid = excluded.amount_paid,
              status = excluded.status,
              invoice_pdf_url = excluded.invoice_pdf_url`,
      args: [organizationId, stripeInvoiceId, amountPaid, seatsBilled, periodStart, periodEnd, status, invoicePdfUrl]
    });
  },

  createPaymentMethod: async (
    organizationId: number | string,
    stripePaymentMethodId: string,
    cardBrand: string | null,
    cardLastFour: string | null,
    isDefault: number
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_payment_methods
              (organization_id, stripe_payment_method_id, card_brand, card_last_four, is_default)
            VALUES (?, ?, ?, ?, ?)`,
      args: [organizationId, stripePaymentMethodId, cardBrand, cardLastFour, isDefault]
    });
  },

  getPaymentMethods: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT * FROM organization_payment_methods
            WHERE organization_id = ?
            ORDER BY is_default DESC, created_at DESC`,
      args: [organizationId]
    });
    return rs.rows;
  },

  setDefaultPaymentMethod: async (organizationId: number | string, paymentMethodId: number | string) => {
    await client.execute({
      sql: 'UPDATE organization_payment_methods SET is_default = 0 WHERE organization_id = ?',
      args: [organizationId]
    });
    return await client.execute({
      sql: 'UPDATE organization_payment_methods SET is_default = 1 WHERE id = ? AND organization_id = ?',
      args: [paymentMethodId, organizationId]
    });
  },

  // --- Platform admin: cross-organization management ---

  getAllOrganizationsForAdmin: async () => {
    const rs = await client.execute({
      sql: `SELECT
              o.*,
              (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.org_role = 'member' AND om.is_active = 1) as member_count,
              (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.org_role = 'therapist' AND om.is_active = 1) as therapist_count,
              (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.org_role = 'org_admin') as admin_count
            FROM organizations o
            ORDER BY o.created_at DESC`,
      args: []
    });
    return rs.rows;
  },

  getOrganizationAdminDetail: async (organizationId: number | string) => {
    const orgRes = await client.execute({ sql: 'SELECT * FROM organizations WHERE id = ?', args: [organizationId] });
    const organization = orgRes.rows[0];
    if (!organization) return null;

    const membersRes = await client.execute({
      sql: `SELECT
              om.id as membership_id,
              om.org_role,
              om.is_active,
              om.joined_at,
              om.invited_at,
              u.id as user_id,
              u.email,
              COALESCE(p.full_name, t.full_name) as full_name
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            LEFT JOIN therapists t ON u.id = t.user_id
            WHERE om.organization_id = ?
            ORDER BY CASE om.org_role WHEN 'org_admin' THEN 0 WHEN 'therapist' THEN 1 ELSE 2 END, u.email ASC`,
      args: [organizationId]
    });

    return { organization, members: membersRes.rows };
  },

  // Permanently deletes an organization and everything tied to it: memberships,
  // invitations, and the org-bound therapist/member user accounts created via
  // invite-accept (plus their sessions, messages, files, etc). Irreversible.
  deleteOrganizationCascade: async (organizationId: number | string) => {
    const usersRes = await client.execute({
      sql: 'SELECT user_id FROM organization_members WHERE organization_id = ?',
      args: [organizationId],
    });
    const userIds = usersRes.rows.map((r: any) => Number(r.user_id));

    if (userIds.length === 0) {
      await client.execute({ sql: 'DELETE FROM organization_invitations WHERE organization_id = ?', args: [organizationId] });
      await client.execute({ sql: 'DELETE FROM organization_members WHERE organization_id = ?', args: [organizationId] });
      await client.execute({ sql: 'DELETE FROM sessions WHERE organization_id = ?', args: [organizationId] });
      await client.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [organizationId] });
      return;
    }

    const userPh = userIds.map(() => '?').join(',');

    const patientsRes = await client.execute({ sql: `SELECT id FROM patients WHERE user_id IN (${userPh})`, args: userIds });
    const patientIds = patientsRes.rows.map((r: any) => Number(r.id));
    const therapistsRes = await client.execute({ sql: `SELECT id FROM therapists WHERE user_id IN (${userPh})`, args: userIds });
    const therapistIds = therapistsRes.rows.map((r: any) => Number(r.id));

    const patientPh = patientIds.map(() => '?').join(',');
    const therapistPh = therapistIds.map(() => '?').join(',');

    const patientOrTherapistWhere = (patientCol: string, therapistCol: string) => {
      const conds: string[] = [];
      const args: number[] = [];
      if (patientIds.length > 0) { conds.push(`${patientCol} IN (${patientPh})`); args.push(...patientIds); }
      if (therapistIds.length > 0) { conds.push(`${therapistCol} IN (${therapistPh})`); args.push(...therapistIds); }
      return { where: conds.join(' OR '), args };
    };

    if (patientIds.length > 0 || therapistIds.length > 0) {
      // patient_files -> progress_entries, patient_goals
      const filesWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      const filesRes = await client.execute({ sql: `SELECT id FROM patient_files WHERE ${filesWhere.where}`, args: filesWhere.args });
      const fileIds = filesRes.rows.map((r: any) => Number(r.id));
      if (fileIds.length > 0) {
        const filePh = fileIds.map(() => '?').join(',');
        await client.execute({ sql: `DELETE FROM progress_entries WHERE patient_file_id IN (${filePh})`, args: fileIds });
        await client.execute({ sql: `DELETE FROM patient_goals WHERE patient_file_id IN (${filePh})`, args: fileIds });
        await client.execute({ sql: `DELETE FROM patient_files WHERE id IN (${filePh})`, args: fileIds });
      }

      // conversations -> messages
      const convWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      const convRes = await client.execute({ sql: `SELECT id FROM conversations WHERE ${convWhere.where}`, args: convWhere.args });
      const convIds = convRes.rows.map((r: any) => Number(r.id));
      if (convIds.length > 0) {
        const convPh = convIds.map(() => '?').join(',');
        await client.execute({ sql: `DELETE FROM messages WHERE conversation_id IN (${convPh})`, args: convIds });
        await client.execute({ sql: `DELETE FROM conversations WHERE id IN (${convPh})`, args: convIds });
      }

      // session_reviews, payments, then sessions themselves
      const reviewsWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      await client.execute({ sql: `DELETE FROM session_reviews WHERE ${reviewsWhere.where}`, args: reviewsWhere.args });

      const paymentsWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      await client.execute({ sql: `DELETE FROM payments WHERE ${paymentsWhere.where}`, args: paymentsWhere.args });

      const sessionsWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      await client.execute({ sql: `DELETE FROM sessions WHERE ${sessionsWhere.where}`, args: sessionsWhere.args });

      // bookmarks
      const bookmarksWhere = patientOrTherapistWhere('patient_id', 'therapist_id');
      await client.execute({ sql: `DELETE FROM bookmarks WHERE ${bookmarksWhere.where}`, args: bookmarksWhere.args });

      // testimonials — preserve the testimonial text, just detach the author (matches ON DELETE SET NULL intent)
      if (patientIds.length > 0) {
        await client.execute({ sql: `UPDATE testimonials SET patient_id = NULL WHERE patient_id IN (${patientPh})`, args: patientIds });
      }
      if (therapistIds.length > 0) {
        await client.execute({ sql: `UPDATE testimonials SET therapist_id = NULL WHERE therapist_id IN (${therapistPh})`, args: therapistIds });
      }
    }

    // Any org-scoped session that somehow wasn't caught above (defense in depth)
    await client.execute({ sql: 'DELETE FROM sessions WHERE organization_id = ?', args: [organizationId] });

    if (therapistIds.length > 0) {
      await client.execute({ sql: `DELETE FROM therapist_documents WHERE therapist_id IN (${therapistPh})`, args: therapistIds });
      await client.execute({ sql: `DELETE FROM availability_schedules WHERE therapist_id IN (${therapistPh})`, args: therapistIds });
      await client.execute({ sql: `DELETE FROM therapists WHERE id IN (${therapistPh})`, args: therapistIds });
    }
    if (patientIds.length > 0) {
      await client.execute({ sql: `DELETE FROM patients WHERE id IN (${patientPh})`, args: patientIds });
    }

    await client.execute({ sql: `DELETE FROM admins WHERE user_id IN (${userPh})`, args: userIds });
    await client.execute({ sql: `DELETE FROM password_resets WHERE user_id IN (${userPh})`, args: userIds });
    await client.execute({ sql: `DELETE FROM user_activity WHERE user_id IN (${userPh})`, args: userIds });

    await client.execute({ sql: 'DELETE FROM organization_invitations WHERE organization_id = ?', args: [organizationId] });
    await client.execute({ sql: 'DELETE FROM organization_members WHERE organization_id = ?', args: [organizationId] });

    await client.execute({ sql: `DELETE FROM users WHERE id IN (${userPh})`, args: userIds });

    await client.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [organizationId] });
  },
};

export async function initializeDatabase() {
  console.warn("initializeDatabase called - manual migration recommended for Turso/LibSQL");
}
