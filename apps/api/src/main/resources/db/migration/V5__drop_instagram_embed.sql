-- Drop the rejected instagram embed setting; the homepage iframes the admin's Instagram social link.
ALTER TABLE site_settings DROP COLUMN IF EXISTS instagram_embed;
