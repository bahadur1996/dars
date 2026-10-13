package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.CaseDtos.CaseResponse;
import bd.dhaka.dars.dto.ComplaintDtos.ComplaintResponse;
import bd.dhaka.dars.dto.DriverDtos.DriverRequest;
import bd.dhaka.dars.dto.DriverDtos.DriverResponse;
import bd.dhaka.dars.dto.DriverDtos.DriverSummary;
import bd.dhaka.dars.dto.DriverDtos.NidCheckResponse;
import bd.dhaka.dars.dto.DriverDtos.StatusRequest;
import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.DriverStatus;
import bd.dhaka.dars.service.CaseService;
import bd.dhaka.dars.service.ComplaintService;
import bd.dhaka.dars.service.DriverService;
import jakarta.validation.Valid;
import java.util.List;
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
    private final ComplaintService complaints;
    private final CaseService cases;

    public DriverController(DriverService service, ComplaintService complaints, CaseService cases) {
        this.service = service;
        this.complaints = complaints;
        this.cases = cases;
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

    @GetMapping("/{id}/complaints")
    @Transactional(readOnly = true)
    public List<ComplaintResponse> complaints(@PathVariable Long id) {
        return complaints.forDriver(service.get(id)).stream()
                .map(c -> ComplaintResponse.from(c, complaints.caseOf(c))).toList();
    }

    @GetMapping("/{id}/cases")
    @Transactional(readOnly = true)
    public List<CaseResponse> cases(@PathVariable Long id) {
        return cases.forDriver(service.get(id)).stream().map(CaseResponse::from).toList();
    }

    private DriverResponse toResponse(Driver d) {
        return DriverResponse.from(d);
    }
}
