package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.AuthDtos.ChangePasswordRequest;
import bd.dhaka.dars.dto.AuthDtos.LoginRequest;
import bd.dhaka.dars.dto.AuthDtos.RefreshRequest;
import bd.dhaka.dars.dto.AuthDtos.TokenResponse;
import bd.dhaka.dars.dto.UserDtos.UserResponse;
import bd.dhaka.dars.security.CurrentUser;
import bd.dhaka.dars.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService service;
    private final CurrentUser currentUser;

    public AuthController(AuthService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req.username(), req.password());
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return service.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest req) {
        service.logout(req.refreshToken());
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public UserResponse me() {
        return UserResponse.from(currentUser.get());
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(Authentication auth, @Valid @RequestBody ChangePasswordRequest req) {
        service.changePassword(auth.getName(), req.currentPassword(), req.newPassword());
    }
}
