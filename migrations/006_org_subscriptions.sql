-- Migration 006: Organization Subscriptions & Billing
-- Adds organization_subscriptions, organization_invoices, organization_payment_methods.
--
-- organization_subscriptions becomes the source of truth for plan/seats. The
-- organizations table itself is NOT modified — organizations.plan_tier and
-- organizations.max_seats stay as fallback defaults for orgs that haven't
-- subscribed yet. Note organizations.plan_tier's CHECK only allows
-- free/pro/enterprise, which is a different vocabulary than the
-- starter/growth/enterprise tiers billed here; the two are intentionally
-- decoupled per the source-of-truth split above.
--
-- Run via: turso db shell <db-name> < migrations/006_org_subscriptions.sql

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_tier TEXT CHECK(plan_tier IN ('starter', 'growth', 'enterprise')) NOT NULL,
  price_per_seat INTEGER NOT NULL,
  max_seats INTEGER,
  billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'past_due', 'canceled', 'trialing')) NOT NULL DEFAULT 'active',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  amount_paid INTEGER NOT NULL,
  seats_billed INTEGER,
  period_start TEXT,
  period_end TEXT,
  status TEXT CHECK(status IN ('paid', 'open', 'void', 'uncollectible')) NOT NULL,
  invoice_pdf_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last_four TEXT,
  is_default BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_stripe_sub ON organization_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_stripe_customer ON organization_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_invoices_org ON organization_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_payment_methods_org ON organization_payment_methods(organization_id);
