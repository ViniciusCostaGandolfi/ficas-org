package br.org.ficas.api.dto.post;

/** Author reference inside post payloads: {@code {id, name}}. */
public record AuthorRef(Long id, String name) {
}
