ALTER TABLE support_requests DROP CONSTRAINT support_requests_status_check;
ALTER TABLE support_requests ADD CONSTRAINT support_requests_status_check CHECK (status IN ('open','in_progress','replied','closed'));
