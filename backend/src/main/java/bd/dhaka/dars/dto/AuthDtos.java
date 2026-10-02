package bd.dhaka.dars.dto;

import bd.dhaka.dars.dto.UserDtos.UserResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
    }
}
