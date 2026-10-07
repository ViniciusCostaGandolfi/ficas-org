-- Replace the rejected token-based Instagram feed config with a simple admin-pasted embed.
ALTER TABLE site_settings DROP COLUMN IF EXISTS instagram;
ALTER TABLE site_settings ADD COLUMN instagram_embed TEXT;
