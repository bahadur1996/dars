package bd.dhaka.dars.owner;

import bd.dhaka.dars.audit.AuditService;
import bd.dhaka.dars.common.ApiException;
import bd.dhaka.dars.owner.OwnerDtos.OwnerRequest;
import bd.dhaka.dars.user.CurrentUser;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OwnerService {

    private final OwnerRepository owners;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public OwnerService(OwnerRepository owners, CurrentUser currentUser, AuditService audit) {
        this.owners = owners;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    @Transactional
    public Owner create(OwnerRequest req) {
        if (owners.findByNid(req.nid()).isPresent()) {
            throw ApiException.conflict("DUPLICATE_NID", "An owner with this NID already exists");
        }
        Owner o = new Owner();
        apply(o, req);
        o.setCreatedBy(currentUser.get());
        o.setCreatedAt(Instant.now());
        owners.save(o);
        audit.log("CREATE", "OWNER", o.getId(), "nid=" + o.getNid());
        return o;
    }

    @Transactional
    public Owner update(Long id, OwnerRequest req) {
        Owner o = get(id);
        currentUser.checkCanEdit(o.getCreatedBy(), o.getCreatedAt());
        owners.findByNid(req.nid())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw ApiException.conflict("DUPLICATE_NID", "An owner with this NID already exists");
                });
        apply(o, req);
        audit.log("UPDATE", "OWNER", o.getId(), null);
        return o;
    }

    @Transactional(readOnly = true)
    public Owner get(Long id) {
        return owners.findById(id).orElseThrow(() -> ApiException.notFound("Owner", id));
    }

    @Transactional(readOnly = true)
    public Page<Owner> search(String q, Pageable pageable) {
        Specification<Owner> spec = (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String term = q.trim();
            return cb.or(
                    cb.equal(root.get("nid"), term),
                    cb.equal(root.get("mobile"), term),
                    cb.like(cb.lower(root.get("fullName")), "%" + term.toLowerCase() + "%"));
        };
        return owners.findAll(spec, pageable);
    }

    private static void apply(Owner o, OwnerRequest req) {
        o.setFullName(req.fullName());
        o.setNid(req.nid());
        o.setMobile(req.mobile());
        o.setAddress(req.address());
    }
}
