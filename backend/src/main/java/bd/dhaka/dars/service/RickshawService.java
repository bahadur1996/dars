package bd.dhaka.dars.service;

import bd.dhaka.dars.dto.RickshawDtos.RickshawRequest;
import bd.dhaka.dars.entity.Ownership;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.entity.RickshawStatus;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.RickshawRepository;
import bd.dhaka.dars.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RickshawService {

    public static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");
    static final String NUMBER_FORMAT = "DHK-AR-%06d";

    private final RickshawRepository rickshaws;
    private final OwnerService owners;
    private final OwnershipService ownerships;
    private final PhotoService photos;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public RickshawService(RickshawRepository rickshaws, OwnerService owners, OwnershipService ownerships,
                           PhotoService photos, CurrentUser currentUser, AuditService audit) {
        this.rickshaws = rickshaws;
        this.owners = owners;
        this.ownerships = ownerships;
        this.photos = photos;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    @Transactional
    public Rickshaw create(RickshawRequest req) {
        if (req.ownerId() == null) {
            throw ApiException.badRequest("OWNER_REQUIRED", "A rickshaw must be registered with an owner");
        }
        String number = req.rickshawNumber();
        if (number == null) {
            number = issueNumber();
        } else if (rickshaws.existsByRickshawNumber(number)) {
            throw ApiException.conflict("DUPLICATE_NUMBER", "Rickshaw number " + number + " is already registered");
        }
        Rickshaw r = new Rickshaw();
        r.setRickshawNumber(number);
        r.setOwner(owners.get(req.ownerId()));
        apply(r, req);
        r.setStatus(RickshawStatus.ACTIVE);
        r.setRegisteredBy(currentUser.get());
        r.setRegisteredAt(Instant.now());
        r.setUpdatedAt(r.getRegisteredAt());
        rickshaws.save(r);
        audit.log("CREATE", "RICKSHAW", r.getId(), "number=" + number);
        ownerships.start(r);
        return r;
    }

    @Transactional
    public Rickshaw update(Long id, RickshawRequest req) {
        Rickshaw r = get(id);
        currentUser.checkCanEdit(r.getRegisteredBy(), r.getRegisteredAt());
        if (req.rickshawNumber() != null && !req.rickshawNumber().equals(r.getRickshawNumber())) {
            if (rickshaws.existsByRickshawNumber(req.rickshawNumber())) {
                throw ApiException.conflict("DUPLICATE_NUMBER",
                        "Rickshaw number " + req.rickshawNumber() + " is already registered");
            }
            r.setRickshawNumber(req.rickshawNumber());
        }
        apply(r, req);
        r.setUpdatedAt(Instant.now());
        audit.log("UPDATE", "RICKSHAW", r.getId(), "number=" + r.getRickshawNumber());
        return r;
    }

    @Transactional
    public Rickshaw updateStatus(Long id, RickshawStatus status, String reason) {
        currentUser.checkAdmin();
        Rickshaw r = get(id);
        RickshawStatus old = r.getStatus();
        r.setStatus(status);
        r.setUpdatedAt(Instant.now());
        audit.log("STATUS", "RICKSHAW", r.getId(), old + " -> " + status + (reason == null ? "" : ": " + reason));
        return r;
    }

    /** FR-13 ownership transfer. Any officer may do this; it is not limited by the 24h edit window. */
    @Transactional
    public Ownership transferOwnership(Long id, Long ownerId, String note) {
        Rickshaw r = get(id);
        return ownerships.transfer(r, owners.get(ownerId), note);
    }

    @Transactional(readOnly = true)
    public Rickshaw get(Long id) {
        return rickshaws.findById(id).orElseThrow(() -> ApiException.notFound("Rickshaw", id));
    }

    @Transactional(readOnly = true)
    public Optional<Rickshaw> findByNumber(String number) {
        return rickshaws.findByRickshawNumber(number.trim().toUpperCase());
    }

    @Transactional(readOnly = true)
    public Rickshaw getByNumber(String number) {
        return rickshaws.findByRickshawNumber(number.trim().toUpperCase())
                .orElseThrow(() -> ApiException.notFound("Rickshaw", number));
    }

    /**
     * FR-7 search. {@code q} matches the rickshaw number (contains) or, exactly, the current owner's
     * NID or mobile. Dates are inclusive, in Dhaka time.
     */
    @Transactional(readOnly = true)
    public Page<Rickshaw> search(String q, String thana, RickshawStatus status, LocalDate from, LocalDate to,
                                 Pageable pageable) {
        Specification<Rickshaw> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String term = q.trim();
                ps.add(cb.or(
                        cb.like(root.get("rickshawNumber"), "%" + term.toUpperCase() + "%"),
                        cb.equal(root.get("owner").get("nid"), term),
                        cb.equal(root.get("owner").get("mobile"), term)));
            }
            if (thana != null && !thana.isBlank()) {
                ps.add(cb.equal(cb.lower(root.get("thana")), thana.trim().toLowerCase()));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("registeredAt"), from.atStartOfDay(DHAKA).toInstant()));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.get("registeredAt"), to.plusDays(1).atStartOfDay(DHAKA).toInstant()));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        return rickshaws.findAll(spec, pageable);
    }

    private String issueNumber() {
        // A manually entered number may already occupy a sequence value; skip over it.
        for (int i = 0; i < 100; i++) {
            String candidate = NUMBER_FORMAT.formatted(rickshaws.nextNumberValue());
            if (!rickshaws.existsByRickshawNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not issue a free rickshaw number");
    }

    private void apply(Rickshaw r, RickshawRequest req) {
        r.setChassisNo(req.chassisNo());
        r.setMotorNo(req.motorNo());
        r.setColor(req.color());
        r.setModel(req.model());
        r.setThana(req.thana());
        r.setPhoto(photos.require(req.photoId(), "photoId"));
        r.setRearPhoto(photos.require(req.rearPhotoId(), "rearPhotoId"));
    }
}
