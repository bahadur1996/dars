package bd.dhaka.dars.service;

import bd.dhaka.dars.dto.ComplaintDtos.PublicComplaintRequest;
import bd.dhaka.dars.entity.CaseFile;
import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.ComplaintStatus;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.CaseRepository;
import bd.dhaka.dars.repository.ComplaintRepository;
import bd.dhaka.dars.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Public complaints (FR-14): filed without login, handled by officers. */
@Service
public class ComplaintService {

    static final String NUMBER_FORMAT = "CMP-%d-%06d";
    private static final Set<ComplaintStatus> DECISIONS = Set.of(ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED);

    private final ComplaintRepository complaints;
    private final CaseRepository cases;
    private final RickshawService rickshaws;
    private final DriverService drivers;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public ComplaintService(ComplaintRepository complaints, CaseRepository cases, RickshawService rickshaws,
                            DriverService drivers, CurrentUser currentUser, AuditService audit) {
        this.complaints = complaints;
        this.cases = cases;
        this.rickshaws = rickshaws;
        this.drivers = drivers;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    /** Files a complaint from the public form. There is no authenticated user, so the audit actor is null. */
    @Transactional
    public Complaint fileFromPublic(PublicComplaintRequest req) {
        if (req.website() != null && !req.website().isBlank()) {
            throw ApiException.badRequest("BAD_REQUEST", "Malformed request"); // honeypot filled: a bot
        }
        Rickshaw rickshaw = rickshaws.findByNumber(req.rickshawNumber()).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "RICKSHAW_NOT_FOUND", "No registered rickshaw has number " + req.rickshawNumber()));
        Driver driver = drivers.findByCode(req.driverCode()).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "DRIVER_NOT_FOUND", "No registered driver has code " + req.driverCode()));

        Complaint c = new Complaint();
        c.setComplaintNo(NUMBER_FORMAT.formatted(Year.now(RickshawService.DHAKA).getValue(),
                complaints.nextNumberValue()));
        c.setRickshaw(rickshaw);
        c.setDriver(driver);
        c.setComplainantName(req.complainantName());
        c.setComplainantPhone(req.complainantPhone());
        c.setComplainantNid(req.complainantNid());
        c.setCategory(req.category());
        c.setDescription(req.description());
        c.setIncidentAt(req.incidentAt());
        c.setThana(req.thana());
        c.setStatus(ComplaintStatus.OPEN);
        c.setFiledAt(Instant.now());
        c.setUpdatedAt(c.getFiledAt());
        complaints.save(c);
        audit.logAs(null, "CREATE", "COMPLAINT", c.getId(), c.getComplaintNo() + " against "
                + rickshaw.getRickshawNumber() + " / " + driver.getDriverCode());
        return c;
    }

    /** Public status lookup. A wrong phone looks exactly like an unknown number, so it reveals nothing. */
    @Transactional(readOnly = true)
    public Complaint lookup(String complaintNo, String phone) {
        String no = complaintNo.trim().toUpperCase();
        return complaints.findByComplaintNo(no)
                .filter(c -> c.getComplainantPhone().equals(phone == null ? null : phone.trim()))
                .orElseThrow(() -> ApiException.notFound("Complaint", no));
    }

    @Transactional
    public Complaint updateStatus(Long id, ComplaintStatus status, String note) {
        Complaint c = get(id);
        requireOpen(c);
        if (!DECISIONS.contains(status)) {
            throw ApiException.badRequest("INVALID_STATUS_TRANSITION",
                    "A complaint can only be resolved or rejected here; file a case to escalate it");
        }
        decide(c, status, note);
        return c;
    }

    /** Marks an open complaint as escalated into {@code caseFile}. Called by {@link CaseService}. */
    @Transactional
    public void escalate(Complaint c, CaseFile caseFile) {
        requireOpen(c);
        decide(c, ComplaintStatus.ESCALATED, "Escalated to case " + caseFile.getCaseNo());
    }

    public void requireOpen(Complaint c) {
        if (c.getStatus() != ComplaintStatus.OPEN) {
            throw ApiException.conflict("COMPLAINT_NOT_OPEN",
                    "Complaint " + c.getComplaintNo() + " is already " + c.getStatus());
        }
    }

    @Transactional(readOnly = true)
    public Complaint get(Long id) {
        return complaints.findById(id).orElseThrow(() -> ApiException.notFound("Complaint", id));
    }

    /** The case this complaint was escalated into, or null. */
    @Transactional(readOnly = true)
    public CaseFile caseOf(Complaint c) {
        return cases.findFirstByComplaint(c).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Complaint> forRickshaw(Rickshaw r) {
        return complaints.findByRickshawOrderByFiledAtDesc(r);
    }

    @Transactional(readOnly = true)
    public List<Complaint> forDriver(Driver d) {
        return complaints.findByDriverOrderByFiledAtDesc(d);
    }

    /**
     * FR-16 search. {@code complainant} matches the complainant's phone or NID exactly; numbers/codes match
     * exactly (case-insensitive). Dates are inclusive filing days in Dhaka time.
     */
    @Transactional(readOnly = true)
    public Page<Complaint> search(ComplaintStatus status, String rickshawNumber, String driverCode, String thana,
                                  String complainant, LocalDate from, LocalDate to, Pageable pageable) {
        Specification<Complaint> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (rickshawNumber != null && !rickshawNumber.isBlank()) {
                ps.add(cb.equal(root.get("rickshaw").get("rickshawNumber"), rickshawNumber.trim().toUpperCase()));
            }
            if (driverCode != null && !driverCode.isBlank()) {
                ps.add(cb.equal(cb.upper(root.get("driver").get("driverCode")), driverCode.trim().toUpperCase()));
            }
            if (thana != null && !thana.isBlank()) {
                ps.add(cb.equal(cb.lower(root.get("thana")), thana.trim().toLowerCase()));
            }
            if (complainant != null && !complainant.isBlank()) {
                String term = complainant.trim();
                ps.add(cb.or(cb.equal(root.get("complainantPhone"), term),
                        cb.equal(root.get("complainantNid"), term)));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("filedAt"), from.atStartOfDay(RickshawService.DHAKA).toInstant()));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.get("filedAt"), to.plusDays(1).atStartOfDay(RickshawService.DHAKA).toInstant()));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        return complaints.findAll(spec, pageable);
    }

    private void decide(Complaint c, ComplaintStatus status, String note) {
        ComplaintStatus old = c.getStatus();
        c.setStatus(status);
        c.setResolutionNote(note);
        c.setHandledBy(currentUser.get());
        c.setUpdatedAt(Instant.now());
        audit.log("STATUS", "COMPLAINT", c.getId(), old + " -> " + status + ": " + note);
    }
}
