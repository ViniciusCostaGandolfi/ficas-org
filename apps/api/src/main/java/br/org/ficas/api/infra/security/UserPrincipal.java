package br.org.ficas.api.infra.security;

/** Authenticated principal derived from a validated JWT. */
public record UserPrincipal(Long id, String email, String name, String role) {
}
