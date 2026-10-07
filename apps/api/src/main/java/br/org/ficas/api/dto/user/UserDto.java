package br.org.ficas.api.dto.user;

/** Public representation of a user: {@code {id, name, email, role}}. */
public record UserDto(Long id, String name, String email, String role) {
}
