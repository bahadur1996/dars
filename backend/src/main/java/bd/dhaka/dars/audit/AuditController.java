package bd.dhaka.dars.audit;

import bd.dhaka.dars.common.PageResponse;
import bd.dhaka.dars.user.UserDtos.UserRef;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Audit log viewer. Restricted to ADMIN in SecurityConfig. */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final AuditRepository repo;

    public AuditController(AuditRepository repo) {
        this.repo = repo;
    }

    public record AuditResponse(Long id, UserRef actor, String action, String entity, String entityId,
                                String details, Instant at) {

        static AuditResponse from(AuditLog a) {
            return new AuditResponse(a.getId(), UserRef.from(a.getActor()), a.getAction(), a.getEntity(),
                    a.getEntityId(), a.getDetails(), a.getAt());
        }
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<AuditResponse> list(
            @RequestParam(required = false) String entity,
            @PageableDefault(size = 50, sort = "at", direction = Sort.Direction.DESC) Pageable pageable) {
        var page = entity == null || entity.isBlank()
                ? repo.findAllBy(pageable)
                : repo.findByEntity(entity.toUpperCase(), pageable);
        return PageResponse.of(page, AuditResponse::from);
    }
}
