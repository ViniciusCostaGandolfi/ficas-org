package br.org.ficas.api.dto.user;

import br.org.ficas.api.model.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Admin create/update payload for users. */
public record UserUpsertRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(min = 6, max = 100) String password,
        @NotNull Role role) {
}
