package bd.dhaka.dars.driver;

import bd.dhaka.dars.audit.AuditService;
import bd.dhaka.dars.common.ApiException;
import bd.dhaka.dars.driver.DriverDtos.DriverRequest;
import bd.dhaka.dars.storage.PhotoService;
import bd.dhaka.dars.user.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DriverService {

    private final DriverRepository drivers;
    private final PhotoService photos;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public DriverService(DriverRepository drivers, PhotoService photos, CurrentUser currentUser, AuditService audit) {
        this.drivers = drivers;
        this.photos = photos;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    @Transactional
    public Driver create(DriverRequest req) {
        drivers.findByNid(req.nid()).ifPresent(existing -> {
            throw duplicateNid(existing);
        });
        Driver d = new Driver();
        apply(d, req);
        d.setDriverCode("DRV-%d-%06d".formatted(Year.now().getValue(), drivers.nextCodeValue()));
        d.setStatus(DriverStatus.ACTIVE);
        d.setRegisteredBy(currentUser.get());
        d.setRegisteredAt(Instant.now());
        d.setUpdatedAt(d.getRegisteredAt());
        drivers.save(d);
        audit.log("CREATE", "DRIVER", d.getId(), "code=" + d.getDriverCode());
        return d;
    }

    @Transactional
    public Driver update(Long id, DriverRequest req) {
        Driver d = get(id);
        currentUser.checkCanEdit(d.getRegisteredBy(), d.getRegisteredAt());
        drivers.findByNid(req.nid())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw duplicateNid(other);
                });
        apply(d, req);
        d.setUpdatedAt(Instant.now());
        audit.log("UPDATE", "DRIVER", d.getId(), "code=" + d.getDriverCode());
        return d;
    }

    @Transactional
    public Driver updateStatus(Long id, DriverStatus status, String reason) {
        currentUser.checkAdmin();
        Driver d = get(id);
        DriverStatus old = d.getStatus();
        d.setStatus(status);
        d.setUpdatedAt(Instant.now());
        audit.log("STATUS", "DRIVER", d.getId(), old + " -> " + status + (reason == null ? "" : ": " + reason));
        return d;
    }

    @Transactional(readOnly = true)
    public Driver get(Long id) {
        return drivers.findById(id).orElseThrow(() -> ApiException.notFound("Driver", id));
    }

    @Transactional(readOnly = true)
    public Optional<Driver> findByNid(String nid) {
        return drivers.findByNid(nid);
    }

    /** Free-text search matches driver code, NID, mobile (exact) or name (contains). */
    @Transactional(readOnly = true)
    public Page<Driver> search(String q, DriverStatus status, Pageable pageable) {
        Specification<Driver> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String term = q.trim();
                ps.add(cb.or(
                        cb.equal(cb.upper(root.get("driverCode")), term.toUpperCase()),
                        cb.equal(root.get("nid"), term),
                        cb.equal(root.get("mobile"), term),
                        cb.like(cb.lower(root.get("fullName")), "%" + term.toLowerCase() + "%")));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        return drivers.findAll(spec, pageable);
    }

    private void apply(Driver d, DriverRequest req) {
        d.setFullName(req.fullName());
        d.setFatherName(req.fatherName());
        d.setDateOfBirth(req.dateOfBirth());
        d.setGender(req.gender());
        d.setNid(req.nid());
        d.setLicenceNo(req.licenceNo());
        d.setMobile(req.mobile());
        d.setPresentAddress(req.presentAddress());
        d.setPermanentAddress(req.permanentAddress());
        d.setBloodGroup(req.bloodGroup());
        d.setEmergencyName(req.emergencyName());
        d.setEmergencyPhone(req.emergencyPhone());
        d.setPhoto(photos.require(req.photoId(), "photoId"));
        d.setNidFront(photos.require(req.nidFrontId(), "nidFrontId"));
        d.setNidBack(photos.require(req.nidBackId(), "nidBackId"));
    }

    private static ApiException duplicateNid(Driver existing) {
        return ApiException.conflict("DUPLICATE_NID",
                "A driver with this NID is already registered as " + existing.getDriverCode());
    }
}
