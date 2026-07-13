-- Migration 007: Organization-scoped tenancy
-- Lets an organization onboard its own therapists AND its own patients (members),
-- scoped so they only see each other. Independent (non-org) users are completely
-- unaffected — every new column here is nullable and defaults to NULL/unscoped.
-- Run via: turso db shell <db-name> < migrations/007_org_scoping.sql

-- 1a. Widen organization_members.org_role to allow 'therapist' alongside the
-- existing 'org_admin'/'member'. SQLite can't ALTER a CHECK constraint, so the
-- table is rebuilt with the wider constraint (same rename-and-copy technique as
-- migration 005's users table). Ids and FKs are preserved since rows are copied
-- as-is before the swap.
PRAGMA foreign_keys=OFF;

CREATE TABLE organization_members_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    org_role TEXT NOT NULL CHECK(org_role IN ('org_admin', 'therapist', 'member')) DEFAULT 'member',
    invited_by INTEGER,
    invited_at DATETIME,
    joined_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO organization_members_new SELECT * FROM organization_members;
DROP TABLE organization_members;
ALTER TABLE organization_members_new RENAME TO organization_members;

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

PRAGMA foreign_keys=ON;

-- 1b. organization_invitations: which role the invite is for, and an optional
-- pre-filled name (SQLite's ALTER TABLE ADD COLUMN supports column-level CHECK
-- constraints as long as the default satisfies them, which 'member' does here).
ALTER TABLE organization_invitations ADD COLUMN org_role TEXT NOT NULL DEFAULT 'member' CHECK(org_role IN ('therapist', 'member'));
ALTER TABLE organization_invitations ADD COLUMN name TEXT;

-- 1c. organizations: branded /org/[slug] entry point fields.
-- logo_url already exists on this table (added earlier). NOTE: ADD COLUMN does not
-- support UNIQUE/PRIMARY KEY constraints in SQLite, so slug uniqueness is enforced
-- via a separate unique index instead of a column constraint.
ALTER TABLE organizations ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
ALTER TABLE organizations ADD COLUMN welcome_message TEXT DEFAULT 'Welcome to our wellness program';
ALTER TABLE organizations ADD COLUMN primary_color TEXT DEFAULT '#4F46E5';

-- 1d. sessions.organization_id — nullable; independent (per-session) bookings
-- never set this, only sessions between an org-bound patient and org-bound
-- therapist do.
ALTER TABLE sessions ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_organization ON sessions(organization_id);

-- 1e. users.organization_id — denormalized shortcut so middleware/JWT creation
-- can resolve a user's org without joining through organization_members every
-- request. Set once during invite-accept; independent users keep this NULL forever.
ALTER TABLE users ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
