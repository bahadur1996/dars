package bd.dhaka.dars.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dars")
public record DarsProperties(
        Jwt jwt,
        String storageDir,
        List<String> corsOrigins,
        String publicBaseUrl,
        Admin admin,
        PublicLimits publicLimits) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {
    }

    public record Admin(String username, String password, String fullName) {
    }

    /** Per-client-IP hourly limits for the unauthenticated complaint endpoints. */
    public record PublicLimits(int complaintsPerHour, int lookupsPerHour) {
    }
}
