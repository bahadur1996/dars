package bd.dhaka.dars.driver;

import bd.dhaka.dars.assignment.AssignmentService;
import bd.dhaka.dars.common.PageResponse;
import bd.dhaka.dars.driver.DriverDtos.DriverRequest;
import bd.dhaka.dars.driver.DriverDtos.DriverResponse;
import bd.dhaka.dars.driver.DriverDtos.DriverSummary;
import bd.dhaka.dars.driver.DriverDtos.NidCheckResponse;
import bd.dhaka.dars.driver.DriverDtos.StatusRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/drivers")
public class DriverController {

    private final DriverService service;
    private final AssignmentService assignments;

    public DriverController(DriverService service, AssignmentService assignments) {
        this.service = service;
        this.assignments = assignments;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<DriverResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) DriverStatus status,
            @PageableDefault(size = 20, sort = "registeredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(service.search(q, status, pageable), this::toResponse);
    }

    @GetMapping("/check-nid")
    @Transactional(readOnly = true)
    public NidCheckResponse checkNid(@RequestParam String nid) {
        return service.findByNid(nid.trim())
                .map(d -> new NidCheckResponse(true, DriverSummary.from(d)))
                .orElse(new NidCheckResponse(false, null));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public DriverResponse get(@PathVariable Long id) {
        return toResponse(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public DriverResponse create(@Valid @RequestBody DriverRequest req) {
        return toResponse(service.create(req));
    }

    @PutMapping("/{id}")
    @Transactional
    public DriverResponse update(@PathVariable Long id, @Valid @RequestBody DriverRequest req) {
        return toResponse(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public DriverResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return toResponse(service.updateStatus(id, req.status(), req.reason()));
    }

    private DriverResponse toResponse(Driver d) {
        return DriverResponse.from(d, assignments.currentRickshawOf(d));
    }
}
