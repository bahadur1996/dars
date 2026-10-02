package bd.dhaka.dars.service;

import bd.dhaka.dars.config.DarsProperties;
import bd.dhaka.dars.dto.AuthDtos.TokenResponse;
import bd.dhaka.dars.dto.UserDtos.UserResponse;
import bd.dhaka.dars.entity.AppUser;
import bd.dhaka.dars.entity.RefreshToken;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.RefreshTokenRepository;
import bd.dhaka.dars.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final DarsProperties props;
    private final AuditService audit;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder encoder,
                       JwtEncoder jwtEncoder, DarsProperties props, AuditService audit) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.props = props;
        this.audit = audit;
    }

    // noRollbackFor: failed-attempt counters and lockouts must persist even though we throw 401.
    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse login(String username, String password) {
        Instant now = Instant.now();
        AppUser user = users.findByUsername(username).orElseThrow(AuthService::badCredentials);
        if (user.isLocked(now)) {
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                    "Too many failed attempts. Try again after " + user.getLockedUntil());
        }
        if (!encoder.matches(password, user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(now.plus(LOCK_DURATION));
                user.setFailedAttempts(0);
                audit.logAs(user, "LOCKED", "USER", user.getId(), "too many failed logins");
            }
            throw badCredentials();
        }
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Account is disabled");
        }
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        audit.logAs(user, "LOGIN", "USER", user.getId(), null);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(String rawToken) {
        RefreshToken token = refreshTokens.findByTokenHash(sha256(rawToken))
                .filter(t -> !t.isRevoked() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                        "Refresh token is invalid or expired"));
        AppUser user = token.getUser();
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Account is disabled");
        }
        token.setRevoked(true); // rotate: each refresh token is single-use
        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawToken) {
        refreshTokens.findByTokenHash(sha256(rawToken)).ifPresent(t -> t.setRevoked(true));
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        AppUser user = users.findByUsername(username).orElseThrow(AuthService::badCredentials);
        if (!encoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "Current password is incorrect");
        }
        user.setPasswordHash(encoder.encode(newPassword));
        refreshTokens.revokeAllFor(user);
        audit.logAs(user, "CHANGE_PASSWORD", "USER", user.getId(), null);
    }

    private TokenResponse issueTokens(AppUser user) {
        Instant now = Instant.now();
        Duration accessTtl = props.jwt().accessTtl();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("dars")
                .subject(user.getUsername())
                .issuedAt(now)
                .expiresAt(now.plus(accessTtl))
                .claim("uid", user.getId())
                .claim("roles", List.of(user.getRole().name()))
                .build();
        String access = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(sha256(refresh), user, now.plus(props.jwt().refreshTtl())));

        return new TokenResponse(access, refresh, accessTtl.toSeconds(), UserResponse.from(user));
    }

    private static ApiException badCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Invalid username or password");
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
