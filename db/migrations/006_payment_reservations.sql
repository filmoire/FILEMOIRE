ALTER TABLE orders ADD COLUMN refund_requested boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN production_committed boolean NOT NULL DEFAULT false;
