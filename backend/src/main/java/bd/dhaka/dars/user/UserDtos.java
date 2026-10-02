package bd.dhaka.dars.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record CreateUserRequest(
            @NotBlank @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$") String username,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 100) String fullName,
            @NotNull Role role) {
    }

    /** Partial update: null fields are left unchanged. */
    public record UpdateUserRequest(
            Boolean enabled,
            @Size(min = 8, max = 72) String newPassword,
            @Size(max = 100) String fullName,
            Role role) {
    }

    public record UserResponse(Long id, String username, String fullName, Role role, boolean enabled,
                               boolean locked, Instant createdAt) {

        public static UserResponse from(AppUser u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole(), u.isEnabled(),
                    u.isLocked(Instant.now()), u.getCreatedAt());
        }
    }

    /** Minimal user reference embedded in other responses ("registered by"). */
    public record UserRef(Long id, String username, String fullName) {

        public static UserRef from(AppUser u) {
            return u == null ? null : new UserRef(u.getId(), u.getUsername(), u.getFullName());
        }
    }
}
