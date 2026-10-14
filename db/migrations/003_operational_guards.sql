ALTER TABLE accounts ADD COLUMN last_mfa_step bigint NOT NULL DEFAULT -1;
CREATE INDEX invitations_expiry_idx ON invitations(expires_at);
CREATE INDEX jobs_kind_state_idx ON jobs(kind,state);
CREATE INDEX versions_approved_idx ON book_versions(project_id,revision DESC) WHERE approved_at IS NOT NULL;
CREATE TABLE service_heartbeats (name text PRIMARY KEY, seen_at timestamptz NOT NULL DEFAULT now());
