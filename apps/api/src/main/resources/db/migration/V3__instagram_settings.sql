-- Instagram feed integration settings, configurable from the admin panel.
-- Existing rows get an empty object; the admin UI/services resolve blanks from env values.
ALTER TABLE site_settings ADD COLUMN instagram JSONB NOT NULL DEFAULT '{}'::jsonb;
