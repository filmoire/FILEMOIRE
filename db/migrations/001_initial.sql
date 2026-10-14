CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE accounts (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL CHECK(email=lower(email)), name text NOT NULL DEFAULT '',
 mfa_secret text, mfa_confirmed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, mfa_verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_idx ON sessions(account_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE login_tokens (
 token_hash text PRIMARY KEY, email text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE INDEX login_tokens_expiry_idx ON login_tokens(expires_at);
CREATE TABLE orders (
 id uuid PRIMARY KEY, buyer_id uuid NOT NULL REFERENCES accounts, request_key uuid NOT NULL,
 total integer NOT NULL CHECK(total>0), currency text NOT NULL DEFAULT 'eur', payload text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','paid','refunded','expired')), checkout_id text UNIQUE,
 payment_id text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(buyer_id,request_key)
);
CREATE INDEX orders_buyer_idx ON orders(buyer_id,created_at);
CREATE TABLE projects (
 id uuid PRIMARY KEY, order_id uuid UNIQUE NOT NULL REFERENCES orders, buyer_id uuid NOT NULL REFERENCES accounts,
 narrator_email text NOT NULL, title text NOT NULL, payload text NOT NULL, revision integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'draft', deletion_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_buyer_idx ON projects(buyer_id);
CREATE TABLE memberships (
 project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE, account_id uuid NOT NULL REFERENCES accounts,
 role text NOT NULL CHECK(role IN ('narrator','editor','contributor')), can_suggest boolean NOT NULL DEFAULT true,
 revoked_at timestamptz, PRIMARY KEY(project_id,account_id)
);
CREATE INDEX memberships_account_idx ON memberships(account_id) WHERE revoked_at IS NULL;
CREATE TABLE invitations (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, email text NOT NULL, name text NOT NULL, role text NOT NULL CHECK(role IN ('narrator','editor','contributor')),
 can_suggest boolean NOT NULL DEFAULT true, expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_project_idx ON invitations(project_id);
CREATE TABLE media (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES accounts,
 object_key text UNIQUE NOT NULL, kind text NOT NULL CHECK(kind IN ('photo','audio','pdf')), mime text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>=0), sha256 text, status text NOT NULL DEFAULT 'ready', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_project_idx ON media(project_id);
CREATE TABLE jobs (
 id uuid PRIMARY KEY, kind text NOT NULL, payload text NOT NULL, dedupe_key text UNIQUE NOT NULL,
 run_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','done','failed')),
 locked_at timestamptz, lock_token uuid, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_due_idx ON jobs(run_at) WHERE state='pending';
CREATE TABLE book_versions (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE, revision integer NOT NULL,
 content_hash text NOT NULL, payload text NOT NULL, approved_by uuid REFERENCES accounts, approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,revision)
);
CREATE TABLE print_orders (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
 version_id uuid NOT NULL REFERENCES book_versions, request_key uuid UNIQUE NOT NULL,
 status text NOT NULL DEFAULT 'requested', provider_id text, tracking text, incident text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(version_id)
);
CREATE TABLE consent_records (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts, project_id uuid REFERENCES projects ON DELETE CASCADE,
 purpose text NOT NULL, version text NOT NULL, accepted boolean NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_account_idx ON consent_records(account_id,recorded_at);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES accounts ON DELETE SET NULL, project_id uuid REFERENCES projects ON DELETE SET NULL,
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_project_idx ON audit_events(project_id,created_at);
CREATE TABLE support_grants (
 project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE, account_id uuid NOT NULL REFERENCES accounts,
 expires_at timestamptz NOT NULL, reason text NOT NULL, PRIMARY KEY(project_id,account_id)
);
CREATE TABLE webhook_events (id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX rate_limits_expiry_idx ON rate_limits(expires_at);
CREATE TABLE audio_links (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE, audio_id text NOT NULL,
 token_hash text UNIQUE NOT NULL, code_hash text NOT NULL, enabled boolean NOT NULL DEFAULT true,
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,audio_id)
);
