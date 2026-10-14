ALTER TABLE book_versions ADD COLUMN pdf_media_id uuid REFERENCES media ON DELETE SET NULL;
