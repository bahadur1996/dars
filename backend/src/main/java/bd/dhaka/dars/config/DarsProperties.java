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
        Admin admin) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {
    }

    public record Admin(String username, String password, String fullName) {
    }
}
