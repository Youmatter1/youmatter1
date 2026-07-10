-- Migration 005: Organizations (B2B)
-- Adds organizations, organization_members, organization_invitations tables
-- and extends users.role to allow 'org_admin'.
-- Run via: turso db shell <db-name> < migrations/005_organizations.sql

-- SQLite/LibSQL can't ALTER a CHECK constraint directly, so the users table
-- is rebuilt with the wider constraint. This preserves ids (and therefore every
-- existing foreign key into users) since rows are copied as-is before the swap.
PRAGMA foreign_keys=OFF;

CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'therapist', 'admin', 'org_admin')),
    is_verified BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

PRAGMA foreign_keys=ON;

-- Organizations (B2B company accounts)
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT,
    logo_url TEXT,
    plan_tier TEXT CHECK(plan_tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    billing_email TEXT,
    max_seats INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Organization members (links a user, usually role='patient', to an organization;
-- the org_admin who manages the dashboard is also a row here with org_role='org_admin')
CREATE TABLE IF NOT EXISTS organization_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    org_role TEXT NOT NULL CHECK(org_role IN ('org_admin', 'member')) DEFAULT 'member',
    invited_by INTEGER,
    invited_at DATETIME,
    joined_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Pending email invitations to join an organization
CREATE TABLE IF NOT EXISTS organization_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by INTEGER,
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
