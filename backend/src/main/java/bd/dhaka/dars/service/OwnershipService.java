package bd.dhaka.dars.service;

import bd.dhaka.dars.entity.Owner;
import bd.dhaka.dars.entity.Ownership;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.OwnershipRepository;
import bd.dhaka.dars.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps ownership history (FR-13). Enforces "one open ownership per rickshaw" and keeps
 * {@code rickshaw.owner} (the current owner) in step with it.
 */
@Service
public class OwnershipService {

    private final OwnershipRepository ownerships;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public OwnershipService(OwnershipRepository ownerships, CurrentUser currentUser, AuditService audit) {
        this.ownerships = ownerships;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    /** Opens the first ownership period of a newly registered rickshaw. */
    @Transactional
    public Ownership start(Rickshaw rickshaw) {
        return ownerships.save(new Ownership(rickshaw, rickshaw.getOwner(), currentUser.get(), null));
    }

    @Transactional
    public Ownership transfer(Rickshaw rickshaw, Owner newOwner, String note) {
        Owner old = rickshaw.getOwner();
        if (old.getId().equals(newOwner.getId())) {
            throw ApiException.badRequest("SAME_OWNER", "The rickshaw already belongs to " + newOwner.getFullName());
        }
        Instant now = Instant.now();
        ownerships.findFirstByRickshawAndToDateIsNull(rickshaw).ifPresent(o -> o.setToDate(now));
        ownerships.flush(); // close the old period before opening the new one
        Ownership created = ownerships.save(new Ownership(rickshaw, newOwner, currentUser.get(), note));
        rickshaw.setOwner(newOwner);
        rickshaw.setUpdatedAt(now);
        audit.log("TRANSFER", "RICKSHAW", rickshaw.getId(), rickshaw.getRickshawNumber() + ": owner "
                + old.getId() + " -> " + newOwner.getId() + (note == null ? "" : ": " + note));
        return created;
    }

    @Transactional(readOnly = true)
    public List<Ownership> history(Rickshaw rickshaw) {
        return ownerships.findByRickshawOrderByFromDateDescIdDesc(rickshaw);
    }
}
