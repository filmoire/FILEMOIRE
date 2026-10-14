-- Run as the migration owner after creating a LOGIN role named filemoire_runtime
-- with a password in your secret manager. Never use this role for migrations.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO filemoire_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO filemoire_runtime;
REVOKE ALL ON schema_migrations FROM filemoire_runtime;
GRANT SELECT ON schema_migrations TO filemoire_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO filemoire_runtime;
