-- Per-row content format for posts and pages.
-- Imported WordPress rows keep the default 'HTML'; admin-authored content may be 'MARKDOWN'.
ALTER TABLE posts ADD COLUMN content_format VARCHAR(10) NOT NULL DEFAULT 'HTML';
ALTER TABLE pages ADD COLUMN content_format VARCHAR(10) NOT NULL DEFAULT 'HTML';
