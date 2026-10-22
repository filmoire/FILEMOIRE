-- Public editorial templates only; never contains family answers or media.
CREATE TABLE question_library (
 id text PRIMARY KEY,
 definition jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
