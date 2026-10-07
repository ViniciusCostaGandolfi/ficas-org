package br.org.ficas.api.dto.category;

/** Lightweight category reference used inside post payloads: {@code {id, slug, name}}. */
public record CategoryRef(Long id, String slug, String name) {
}
