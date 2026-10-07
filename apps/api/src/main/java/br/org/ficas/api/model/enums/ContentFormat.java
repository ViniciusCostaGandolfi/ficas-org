package br.org.ficas.api.model.enums;

/**
 * Format of the raw {@code content} string stored for posts and pages. Rows imported from the
 * legacy WordPress site remain {@link #HTML}; content authored in the admin UI is {@link #MARKDOWN}.
 */
public enum ContentFormat {
    HTML,
    MARKDOWN
}
