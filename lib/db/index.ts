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

  createOrganization: async (name: string, domain: string | null, billingEmail: string | null) => {
    return await client.execute({
      sql: `INSERT INTO organizations (name, domain, billing_email) VALUES (?, ?, ?)`,
      args: [name, domain, billingEmail]
    });
  },

  createOwnerMembership: async (organizationId: number | string, userId: number | string) => {
    return await client.execute({
      sql: `INSERT INTO organization_members (organization_id, user_id, org_role, joined_at, is_active)
            VALUES (?, ?, 'org_admin', CURRENT_TIMESTAMP, 1)`,
      args: [organizationId, userId]
    });
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

  getMembersPaginated: async (organizationId: number | string, limit: number, offset: number) => {
    const rs = await client.execute({
      sql: `SELECT
              om.id as membership_id,
              om.user_id,
              om.is_active,
              om.invited_at,
              om.joined_at,
              u.email,
              p.full_name,
              p.profile_picture,
              COUNT(DISTINCT s.id) as session_count,
              MAX(s.scheduled_date) as last_session_date
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            LEFT JOIN patients p ON p.user_id = om.user_id
            LEFT JOIN sessions s ON s.patient_id = p.id
            WHERE om.organization_id = ? AND om.org_role = 'member'
            GROUP BY om.id
            ORDER BY COALESCE(om.joined_at, om.invited_at) DESC
            LIMIT ? OFFSET ?`,
      args: [organizationId, limit, offset]
    });
    return rs.rows;
  },

  getMembershipRowById: async (organizationId: number | string, membershipId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT id FROM organization_members
            WHERE id = ? AND organization_id = ? AND org_role = 'member'`,
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
            WHERE om.organization_id = ? AND u.email = ? AND om.org_role = 'member'`,
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
    expiresAt: string
  ) => {
    return await client.execute({
      sql: `INSERT INTO organization_invitations (organization_id, email, token, invited_by, expires_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [organizationId, email, token, invitedBy, expiresAt]
    });
  },

  getPendingInvitations: async (organizationId: number | string) => {
    const rs = await client.execute({
      sql: `SELECT oi.id, oi.email, oi.expires_at, oi.created_at, u.email as invited_by_email
            FROM organization_invitations oi
            LEFT JOIN users u ON oi.invited_by = u.id
            WHERE oi.organization_id = ? AND oi.accepted_at IS NULL AND oi.expires_at > CURRENT_TIMESTAMP
            ORDER BY oi.created_at DESC`,
      args: [organizationId]
    });
    return rs.rows;
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
};

export async function initializeDatabase() {
  console.warn("initializeDatabase called - manual migration recommended for Turso/LibSQL");
}
