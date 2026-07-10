INSERT INTO organizations (name, domain, plan_tier, billing_email, max_seats)
VALUES ('Acme Inc', 'acme.com', 'pro', 'billing@acme.com', 25);

INSERT INTO users (email, password_hash, role, is_verified, is_active)
VALUES ('admin@acme.com', '$2b$10$xENyeqRFaUv/VeJF6ZcdguA.eGaaC8LGwRNbgl5mxtWRCJIR8Pnrm', 'org_admin', 1, 1);

INSERT INTO organization_members (organization_id, user_id, org_role, joined_at, is_active)
VALUES (
  (SELECT id FROM organizations WHERE domain = 'acme.com'),
  (SELECT id FROM users WHERE email = 'admin@acme.com'),
  'org_admin', CURRENT_TIMESTAMP, 1
);