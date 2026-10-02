package bd.dhaka.dars.user;

import bd.dhaka.dars.audit.AuditService;
import bd.dhaka.dars.common.ApiException;
import bd.dhaka.dars.user.UserDtos.CreateUserRequest;
import bd.dhaka.dars.user.UserDtos.UpdateUserRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final CurrentUser currentUser;

    public UserService(UserRepository users, PasswordEncoder encoder, AuditService audit, CurrentUser currentUser) {
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public Page<AppUser> list(Pageable pageable) {
        return users.findAll(pageable);
    }

    @Transactional
    public AppUser create(CreateUserRequest req) {
        if (users.existsByUsername(req.username())) {
            throw ApiException.conflict("USERNAME_TAKEN", "Username already exists");
        }
        AppUser user = users.save(new AppUser(req.username(), encoder.encode(req.password()), req.fullName(), req.role()));
        audit.log("CREATE", "USER", user.getId(), "username=" + user.getUsername() + ", role=" + user.getRole());
        return user;
    }

    @Transactional
    public AppUser update(Long id, UpdateUserRequest req) {
        AppUser user = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        if (user.getId().equals(currentUser.get().getId())
                && (Boolean.FALSE.equals(req.enabled()) || (req.role() != null && req.role() != user.getRole()))) {
            throw ApiException.badRequest("SELF_LOCKOUT", "You cannot disable yourself or change your own role");
        }
        StringBuilder changes = new StringBuilder();
        if (req.enabled() != null) {
            user.setEnabled(req.enabled());
            changes.append("enabled=").append(req.enabled()).append(' ');
        }
        if (req.fullName() != null) {
            user.setFullName(req.fullName());
            changes.append("fullName ");
        }
        if (req.role() != null) {
            user.setRole(req.role());
            changes.append("role=").append(req.role()).append(' ');
        }
        if (req.newPassword() != null) {
            user.setPasswordHash(encoder.encode(req.newPassword()));
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
            changes.append("passwordReset ");
        }
        audit.log("UPDATE", "USER", user.getId(), changes.toString().trim());
        return user;
    }
}
