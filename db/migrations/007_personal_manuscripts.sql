-- Manuscripts do not imply a paid order or an entitlement to printed copies.
ALTER TABLE projects ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE projects ADD COLUMN kind text NOT NULL DEFAULT 'purchased';
ALTER TABLE projects ADD COLUMN creation_key uuid;
ALTER TABLE projects ADD COLUMN creation_hash text;
ALTER TABLE projects ADD CONSTRAINT projects_kind_check CHECK (
 (kind='purchased' AND order_id IS NOT NULL) OR
 (kind='personal' AND order_id IS NULL AND creation_key IS NOT NULL AND creation_hash IS NOT NULL)
);
CREATE UNIQUE INDEX projects_creation_key_idx ON projects(buyer_id,creation_key) WHERE creation_key IS NOT NULL;
