package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.ComplaintDtos.ComplaintResponse;
import bd.dhaka.dars.dto.ComplaintDtos.ComplaintStatusRequest;
import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.ComplaintStatus;
import bd.dhaka.dars.service.ComplaintService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Staff side of complaints (FR-14, FR-16). Complaints are filed through {@link PublicComplaintController}. */
@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {

    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<ComplaintResponse> search(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) String rickshawNumber,
            @RequestParam(required = false) String driverCode,
            @RequestParam(required = false) String thana,
            @RequestParam(required = false) String complainant,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "filedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(service.search(status, rickshawNumber, driverCode, thana, complainant, from, to,
                pageable), this::toResponse);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ComplaintResponse get(@PathVariable Long id) {
        return toResponse(service.get(id));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public ComplaintResponse updateStatus(@PathVariable Long id, @Valid @RequestBody ComplaintStatusRequest req) {
        return toResponse(service.updateStatus(id, req.status(), req.note()));
    }

    private ComplaintResponse toResponse(Complaint c) {
        return ComplaintResponse.from(c, service.caseOf(c));
    }
}
