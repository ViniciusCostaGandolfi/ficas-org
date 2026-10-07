package br.org.ficas.api.dto.lead;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Public contact form payload. */
public record ContactRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @NotBlank @Size(max = 5000) String message,
        @AssertTrue(message = "consent is required") Boolean consent,
        @Size(max = 100) String source) {
}
