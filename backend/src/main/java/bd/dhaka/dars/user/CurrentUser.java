package bd.dhaka.dars.user;

import bd.dhaka.dars.common.ApiException;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the authenticated user and applies the record edit policy. */
@Component
public class CurrentUser {

    /** Officers may edit their own records for this long after registering them. */
    public static final Duration OFFICER_EDIT_WINDOW = Duration.ofHours(24);

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public AppUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw ApiException.forbidden("Not authenticated");
        }
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> ApiException.forbidden("Unknown user"));
    }

    /** ADMIN may edit anything; an OFFICER only their own records within the edit window. */
    public void checkCanEdit(AppUser registeredBy, Instant registeredAt) {
        AppUser me = get();
        if (me.getRole() == Role.ADMIN) {
            return;
        }
        boolean own = registeredBy.getId().equals(me.getId());
        boolean inWindow = registeredAt.plus(OFFICER_EDIT_WINDOW).isAfter(Instant.now());
        if (!own || !inWindow) {
            throw ApiException.forbidden("Officers can only edit their own records within 24 hours");
        }
    }

    public void checkAdmin() {
        if (get().getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Admin role required");
        }
    }
}
