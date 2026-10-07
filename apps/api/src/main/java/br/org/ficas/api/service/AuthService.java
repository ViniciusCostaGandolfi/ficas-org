package br.org.ficas.api.service;

import br.org.ficas.api.infra.config.AppProperties;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.UserRepository;
import br.org.ficas.api.infra.security.JwtAuthFilter;
import br.org.ficas.api.infra.security.JwtService;
import br.org.ficas.api.infra.security.UserPrincipal;
import br.org.ficas.api.dto.auth.LoginRequest;
import br.org.ficas.api.dto.user.UserDto;
import br.org.ficas.api.model.entity.User;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Authentication use cases: password verification, JWT cookie issuance/clearing.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties properties;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AppProperties properties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public UserDto login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        writeCookie(response, jwtService.generate(user), jwtService.ttl());
        return UserService.toDto(user);
    }

    public void logout(HttpServletResponse response) {
        writeCookie(response, "", Duration.ZERO);
    }

    @Transactional(readOnly = true)
    public UserDto currentUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> NotFoundException.of("User", principal.id()));
        return UserService.toDto(user);
    }

    @Transactional(readOnly = true)
    public UserDto refresh(UserPrincipal principal, HttpServletResponse response) {
        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> NotFoundException.of("User", principal.id()));
        writeCookie(response, jwtService.generate(user), jwtService.ttl());
        return UserService.toDto(user);
    }

    private void writeCookie(HttpServletResponse response, String token, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(JwtAuthFilter.COOKIE_NAME, token)
                .httpOnly(true)
                .secure(properties.cookie().secure())
                .path("/")
                .sameSite("Lax")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
