package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.CaseDtos.CaseRequest;
import bd.dhaka.dars.dto.CaseDtos.CaseResponse;
import bd.dhaka.dars.dto.CaseDtos.CaseStatusRequest;
import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.entity.CaseStatus;
import bd.dhaka.dars.service.CaseService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Cases against rickshaws and drivers (FR-15, FR-16). */
@RestController
@RequestMapping("/api/v1/cases")
public class CaseController {

    private final CaseService service;

    public CaseController(CaseService service) {
        this.service = service;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<CaseResponse> search(
            @RequestParam(required = false) CaseStatus status,
            @RequestParam(required = false) String rickshawNumber,
            @RequestParam(required = false) String driverCode,
            @RequestParam(required = false) String thana,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "filedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(service.search(status, rickshawNumber, driverCode, thana, from, to, pageable),
                CaseResponse::from);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public CaseResponse get(@PathVariable Long id) {
        return CaseResponse.from(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CaseResponse create(@Valid @RequestBody CaseRequest req) {
        return CaseResponse.from(service.create(req));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public CaseResponse updateStatus(@PathVariable Long id, @Valid @RequestBody CaseStatusRequest req) {
        return CaseResponse.from(service.updateStatus(id, req.status(), req.note()));
    }
}
