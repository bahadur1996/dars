package bd.dhaka.dars.service;

import bd.dhaka.dars.dto.DriverDtos.RickshawRef;
import bd.dhaka.dars.entity.Assignment;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.DriverStatus;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.AssignmentRepository;
import bd.dhaka.dars.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Enforces "one active driver per rickshaw, one active rickshaw per driver" (FR-6). */
@Service
public class AssignmentService {

    private final AssignmentRepository assignments;
    private final CurrentUser currentUser;
    private final AuditService audit;

    public AssignmentService(AssignmentRepository assignments, CurrentUser currentUser, AuditService audit) {
        this.assignments = assignments;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    @Transactional
    public Assignment assign(Rickshaw rickshaw, Driver driver) {
        if (driver.getStatus() != DriverStatus.ACTIVE) {
            throw ApiException.badRequest("DRIVER_NOT_ACTIVE",
                    "Driver " + driver.getDriverCode() + " is " + driver.getStatus());
        }
        assignments.findFirstByDriverAndToDateIsNull(driver).ifPresent(a -> {
            if (!a.getRickshaw().getId().equals(rickshaw.getId())) {
                throw ApiException.conflict("DRIVER_ALREADY_ASSIGNED", "Driver " + driver.getDriverCode()
                        + " is already assigned to " + a.getRickshaw().getRickshawNumber());
            }
        });
        var current = assignments.findFirstByRickshawAndToDateIsNull(rickshaw);
        if (current.isPresent() && current.get().getDriver().getId().equals(driver.getId())) {
            return current.get(); // already assigned; nothing to do
        }
        current.ifPresent(a -> a.setToDate(Instant.now()));
        assignments.flush(); // close the old assignment before opening the new one
        Assignment created = assignments.save(new Assignment(rickshaw, driver, currentUser.get()));
        audit.log("ASSIGN", "RICKSHAW", rickshaw.getId(),
                rickshaw.getRickshawNumber() + " -> " + driver.getDriverCode());
        return created;
    }

    @Transactional(readOnly = true)
    public Driver currentDriverOf(Rickshaw rickshaw) {
        return assignments.findFirstByRickshawAndToDateIsNull(rickshaw).map(Assignment::getDriver).orElse(null);
    }

    @Transactional(readOnly = true)
    public RickshawRef currentRickshawOf(Driver driver) {
        return assignments.findFirstByDriverAndToDateIsNull(driver)
                .map(a -> new RickshawRef(a.getRickshaw().getId(), a.getRickshaw().getRickshawNumber()))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Assignment> history(Rickshaw rickshaw) {
        return assignments.findByRickshawOrderByFromDateDesc(rickshaw);
    }
}
