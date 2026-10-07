-- FICAS MVP schema (see docs/api-contract.md).
-- PostgreSQL 18.

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE media_assets (
    id         BIGSERIAL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL,
    url        VARCHAR(500) NOT NULL UNIQUE,
    mime_type  VARCHAR(120) NOT NULL,
    size_bytes BIGINT       NOT NULL,
    alt        VARCHAR(500),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_assets_url ON media_assets (url);

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    slug        VARCHAR(150) NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE tags (
    id   BIGSERIAL PRIMARY KEY,
    slug VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
);

CREATE TABLE posts (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    excerpt         VARCHAR(1000),
    content         TEXT,
    cover_media_id  BIGINT REFERENCES media_assets (id) ON DELETE SET NULL,
    category_id     BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    author_id       BIGINT REFERENCES users (id) ON DELETE SET NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    published_at    TIMESTAMPTZ,
    seo_title       VARCHAR(255),
    seo_description VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_slug ON posts (slug);
CREATE INDEX idx_posts_status ON posts (status);
CREATE INDEX idx_posts_published_at ON posts (published_at);
CREATE INDEX idx_posts_category_id ON posts (category_id);

CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE pages (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    excerpt         VARCHAR(1000),
    hero_media_id   BIGINT REFERENCES media_assets (id) ON DELETE SET NULL,
    menu_order      INTEGER      NOT NULL DEFAULT 0,
    show_in_menu    BOOLEAN      NOT NULL DEFAULT FALSE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    seo_title       VARCHAR(255),
    seo_description VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_pages_slug ON pages (slug);
CREATE INDEX idx_pages_status ON pages (status);

CREATE TABLE menu_items (
    id         BIGSERIAL PRIMARY KEY,
    label      VARCHAR(150) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    target     VARCHAR(20)  NOT NULL DEFAULT '_self',
    sort_order INTEGER      NOT NULL DEFAULT 0,
    parent_id  BIGINT REFERENCES menu_items (id) ON DELETE CASCADE
);
CREATE INDEX idx_menu_items_parent_id ON menu_items (parent_id);

CREATE TABLE site_settings (
    id               SMALLINT PRIMARY KEY DEFAULT 1,
    site_name        VARCHAR(255) NOT NULL,
    site_description VARCHAR(1000),
    logo_url         VARCHAR(500),
    favicon_url      VARCHAR(500),
    social           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    contact          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    pix              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT site_settings_singleton CHECK (id = 1)
);

CREATE TABLE contact_leads (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    phone      VARCHAR(50),
    message    TEXT         NOT NULL,
    source     VARCHAR(100),
    consent    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_leads_created_at ON contact_leads (created_at);

CREATE TABLE campaigns (
    id             BIGSERIAL PRIMARY KEY,
    slug           VARCHAR(255) NOT NULL UNIQUE,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    cover_media_id BIGINT REFERENCES media_assets (id) ON DELETE SET NULL,
    form_schema    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_slug ON campaigns (slug);
CREATE INDEX idx_campaigns_status ON campaigns (status);

CREATE TABLE campaign_submissions (
    id                BIGSERIAL PRIMARY KEY,
    campaign_id       BIGINT       NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    organization_name VARCHAR(255),
    cnpj              VARCHAR(20),
    contact_name      VARCHAR(255),
    contact_email     VARCHAR(255),
    contact_phone     VARCHAR(50),
    answers           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_submissions_campaign_id ON campaign_submissions (campaign_id);

CREATE TABLE submission_attachments (
    id            BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES campaign_submissions (id) ON DELETE CASCADE,
    media_id      BIGINT NOT NULL REFERENCES media_assets (id) ON DELETE CASCADE
);
CREATE INDEX idx_submission_attachments_submission_id ON submission_attachments (submission_id);

CREATE TABLE redirects (
    id          BIGSERIAL PRIMARY KEY,
    from_path   VARCHAR(500) NOT NULL UNIQUE,
    to_path     VARCHAR(500) NOT NULL,
    status_code INTEGER      NOT NULL DEFAULT 301
);
