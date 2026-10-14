CREATE TABLE uploads (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES accounts, memory_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('photo','audio')),
 bytes bigint NOT NULL CHECK(bytes>0 AND bytes<=52428800), mime text NOT NULL, caption text NOT NULL DEFAULT '',
 parts jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'uploading',
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX uploads_expiry_idx ON uploads(expires_at) WHERE status='uploading';
