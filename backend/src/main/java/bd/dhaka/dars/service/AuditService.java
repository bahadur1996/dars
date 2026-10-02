package bd.dhaka.dars.service;

import bd.dhaka.dars.entity.AppUser;
import bd.dhaka.dars.entity.AuditLog;
import bd.dhaka.dars.repository.AuditRepository;
import bd.dhaka.dars.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditRepository repo;
    private final UserRepository users;

    public AuditService(AuditRepository repo, UserRepository users) {
        this.repo = repo;
        this.users = users;
    }

    /** Records an action by the currently authenticated user. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void log(String action, String entity, Object entityId, String details) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AppUser actor = auth == null ? null : users.findByUsername(auth.getName()).orElse(null);
        logAs(actor, action, entity, entityId, details);
    }

    /** Records an action by an explicit actor (e.g. during login, before a security context exists). */
    @Transactional(propagation = Propagation.REQUIRED)
    public void logAs(AppUser actor, String action, String entity, Object entityId, String details) {
        repo.save(new AuditLog(actor, action, entity, entityId == null ? null : entityId.toString(), details));
    }
}
