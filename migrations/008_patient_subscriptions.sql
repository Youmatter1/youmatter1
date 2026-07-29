-- Migration 008: Patient subscriptions
-- Moves patients from per-session payment to a monthly subscription model.
-- Currently a promotional free tier (price = 0, plan_name = 'free_promo').
-- Built so that flipping to a paid plan later (price = 5000, RWF, Stripe
-- billing) is a config/data change, not a rewrite: the status check and
-- gating infrastructure already exist.
-- Run via: turso db shell <db-name> < migrations/008_patient_subscriptions.sql

CREATE TABLE IF NOT EXISTS patient_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_name TEXT NOT NULL DEFAULT 'free_promo',
    price INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'RWF',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL CHECK(status IN ('active', 'canceled', 'expired')) DEFAULT 'active',
    promo_label TEXT DEFAULT 'Early Access - Free',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    canceled_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_user ON patient_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_status ON patient_subscriptions(status);
