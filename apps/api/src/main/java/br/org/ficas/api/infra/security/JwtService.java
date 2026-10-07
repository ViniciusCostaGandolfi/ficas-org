package br.org.ficas.api.infra.security;

import br.org.ficas.api.infra.config.AppProperties;
import br.org.ficas.api.model.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Minimal, dependency-free HS256 JWT implementation.
 *
 * <p>Kept intentionally small to avoid pulling an extra JWT library; the API is stateless and the
 * token payload carries only identity claims. Signature comparison is constant-time.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final java.time.Duration ttl;

    public JwtService(ObjectMapper objectMapper, AppProperties properties) {
        this.objectMapper = objectMapper;
        this.secret = properties.jwt().secret().getBytes(StandardCharsets.UTF_8);
        this.ttl = properties.jwt().ttl();
    }

    public java.time.Duration ttl() {
        return ttl;
    }

    public String generate(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(ttl);
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sub", String.valueOf(user.getId()));
        payload.put("email", user.getEmail());
        payload.put("name", user.getName());
        payload.put("role", user.getRole().name());
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", expiresAt.getEpochSecond());

        String header = ENCODER.encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
        String body = ENCODER.encodeToString(payload.toString().getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + body;
        return signingInput + "." + sign(signingInput);
    }

    public Optional<UserPrincipal> parse(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return Optional.empty();
        }
        String signingInput = parts[0] + "." + parts[1];
        String expected = sign(signingInput);
        if (!constantTimeEquals(expected, parts[2])) {
            return Optional.empty();
        }
        try {
            byte[] json = DECODER.decode(parts[1]);
            var payload = objectMapper.readTree(json);
            if (payload.path("exp").asLong(0) < Instant.now().getEpochSecond()) {
                return Optional.empty();
            }
            return Optional.of(new UserPrincipal(
                    Long.valueOf(payload.path("sub").asText()),
                    payload.path("email").asText(),
                    payload.path("name").asText(),
                    payload.path("role").asText()));
        } catch (RuntimeException | java.io.IOException ex) {
            log.debug("jwt_parse_failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return ENCODER.encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
