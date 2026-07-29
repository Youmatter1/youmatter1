-- Migration 009: Session feedback
-- Lets a patient rate and comment on a completed session. One feedback row
-- per session (enforced by the UNIQUE constraint on session_id). patient_id
-- and therapist_id reference users(id) directly (not patients/therapists),
-- per spec, since feedback is about the person, not the role profile.
-- Run via: turso db shell <db-name> < migrations/009_session_feedback.sql

CREATE TABLE IF NOT EXISTS session_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL UNIQUE,
    patient_id INTEGER NOT NULL,
    therapist_id INTEGER NOT NULL,
    organization_id INTEGER REFERENCES organizations(id) DEFAULT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    would_recommend BOOLEAN,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_feedback_therapist ON session_feedback(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_organization ON session_feedback(organization_id);

-- Cleanup: remove stale test invitation from Ebitech org (left over from
-- manual testing of a broken invite link earlier; safe since it was never
-- accepted).
DELETE FROM organization_invitations
WHERE organization_id = (SELECT id FROM organizations WHERE slug LIKE '%ebitech%' OR name LIKE '%Ebitech%')
  AND accepted_at IS NULL;
