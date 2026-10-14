CREATE TABLE support_requests (id uuid PRIMARY KEY,payload text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','replied','closed')),reply text,created_at timestamptz NOT NULL DEFAULT now(),replied_at timestamptz);
CREATE INDEX support_requests_open_idx ON support_requests(created_at) WHERE status='open';
