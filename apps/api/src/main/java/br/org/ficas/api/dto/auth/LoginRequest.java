package br.org.ficas.api.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Login payload: {@code {email, password}}. */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password) {
}
