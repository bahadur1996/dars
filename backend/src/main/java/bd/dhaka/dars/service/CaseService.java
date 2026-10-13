package bd.dhaka.dars.service;

import bd.dhaka.dars.dto.CaseDtos.CaseRequest;
import bd.dhaka.dars.entity.CaseFile;
import bd.dhaka.dars.entity.CaseStatus;
import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.CaseRepository;
import bd.dhaka.dars.security.CurrentUser;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cases against a rickshaw and/or a driver (FR-15). Status flow: OPEN → UNDER_INVESTIGATION → CLOSED / DISMISSED
 * (OPEN may also close directly). Only an ADMIN may reopen a closed or dismissed case.
 */
@Service
public class CaseService {

    static final String NUMBER_FORMAT = "CASE-%d-%06d";

    private final CaseRepository cases;
    private final ComplaintService complaints;
    private final RickshawService rickshaws;
    private final DriverService drivers;
    private final PhotoService photos;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public CaseService(CaseRepository cases, ComplaintService complaints, RickshawService rickshaws,
                       DriverService drivers, PhotoService photos, CurrentUser currentUser, AuditService audit) {
        this.cases = cases;
        this.complaints = complaints;
        this.rickshaws = rickshaws;
        this.drivers = drivers;
        this.photos = photos;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    @Transactional
    public CaseFile create(CaseRequest req) {
        Complaint complaint = req.complaintId() == null ? null : complaints.get(req.complaintId());
        if (complaint != null) {
            complaints.requireOpen(complaint);
        }
        Rickshaw rickshaw = req.rickshawId() != null ? rickshaws.get(req.rickshawId())
                : complaint != null ? complaint.getRickshaw() : null;
        Driver driver = req.driverId() != null ? drivers.get(req.driverId())
                : complaint != null ? complaint.getDriver() : null;
        if (rickshaw == null && driver == null) {
            throw ApiException.badRequest("CASE_TARGET_REQUIRED", "A case needs a rickshaw, a driver, or both");
        }

        CaseFile c = new CaseFile();
        c.setCaseNo(NUMBER_FORMAT.formatted(Year.now(RickshawService.DHAKA).getValue(), cases.nextNumberValue()));
        c.setRickshaw(rickshaw);
        c.setDriver(driver);
        c.setComplaint(complaint);
        c.setOffence(req.offence());
        c.setDescription(req.description());
        c.setIncidentAt(req.incidentAt());
        c.setThana(req.thana());
        c.setStatus(CaseStatus.OPEN);
        for (UUID photoId : req.evidencePhotoIds().stream().distinct().toList()) {
            c.getEvidence().add(photos.require(photoId, "evidencePhotoIds"));
        }
        c.setFiledBy(currentUser.get());
        c.setFiledAt(Instant.now());
        c.setUpdatedAt(c.getFiledAt());
        cases.save(c);
        audit.log("CREATE", "CASE", c.getId(), c.getCaseNo() + " against "
                + (rickshaw == null ? "-" : rickshaw.getRickshawNumber()) + " / "
                + (driver == null ? "-" : driver.getDriverCode()));
        if (complaint != null) {
            complaints.escalate(complaint, c);
        }
        return c;
    }

    @Transactional
    public CaseFile updateStatus(Long id, CaseStatus status, String note) {
        CaseFile c = get(id);
        CaseStatus old = c.getStatus();
        boolean allowed;
        if (old.isFinal()) {
            allowed = status == CaseStatus.OPEN;
            if (allowed) {
                currentUser.checkAdmin(); // reopening is ADMIN-only
            }
        } else {
            allowed = status != old && status != CaseStatus.OPEN;
        }
        if (!allowed) {
            throw ApiException.badRequest("INVALID_STATUS_TRANSITION",
                    "A case cannot go from " + old + " to " + status);
        }
        Instant now = Instant.now();
        c.setStatus(status);
        c.setResolutionNote(note);
        c.setClosedAt(status.isFinal() ? now : null);
        c.setUpdatedAt(now);
        audit.log("STATUS", "CASE", c.getId(), old + " -> " + status + ": " + note);
        return c;
    }

    @Transactional(readOnly = true)
    public CaseFile get(Long id) {
        return cases.findById(id).orElseThrow(() -> ApiException.notFound("Case", id));
    }

    @Transactional(readOnly = true)
    public List<CaseFile> forRickshaw(Rickshaw r) {
        return cases.findByRickshawOrderByFiledAtDesc(r);
    }

    @Transactional(readOnly = true)
    public List<CaseFile> forDriver(Driver d) {
        return cases.findByDriverOrderByFiledAtDesc(d);
    }

    /** FR-16 search. Numbers/codes match exactly (case-insensitive); dates are inclusive filing days in Dhaka time. */
    @Transactional(readOnly = true)
    public Page<CaseFile> search(CaseStatus status, String rickshawNumber, String driverCode, String thana,
                                 LocalDate from, LocalDate to, Pageable pageable) {
        Specification<CaseFile> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            // Left joins: either target may be missing.
            if (rickshawNumber != null && !rickshawNumber.isBlank()) {
                ps.add(cb.equal(root.join("rickshaw", JoinType.LEFT)
                        .get("rickshawNumber"), rickshawNumber.trim().toUpperCase()));
            }
            if (driverCode != null && !driverCode.isBlank()) {
                ps.add(cb.equal(cb.upper(root.join("driver", JoinType.LEFT)
                        .get("driverCode")), driverCode.trim().toUpperCase()));
            }
            if (thana != null && !thana.isBlank()) {
                ps.add(cb.equal(cb.lower(root.get("thana")), thana.trim().toLowerCase()));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("filedAt"), from.atStartOfDay(RickshawService.DHAKA).toInstant()));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.get("filedAt"), to.plusDays(1).atStartOfDay(RickshawService.DHAKA).toInstant()));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        return cases.findAll(spec, pageable);
    }
}
