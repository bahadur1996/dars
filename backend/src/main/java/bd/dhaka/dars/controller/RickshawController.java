package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.dto.RickshawDtos.AssignRequest;
import bd.dhaka.dars.dto.RickshawDtos.AssignmentResponse;
import bd.dhaka.dars.dto.RickshawDtos.RickshawRequest;
import bd.dhaka.dars.dto.RickshawDtos.RickshawResponse;
import bd.dhaka.dars.dto.RickshawDtos.StatusRequest;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.entity.RickshawStatus;
import bd.dhaka.dars.service.AssignmentService;
import bd.dhaka.dars.service.CardService;
import bd.dhaka.dars.service.RickshawService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/rickshaws")
public class RickshawController {

    private final RickshawService service;
    private final AssignmentService assignments;
    private final CardService cards;

    public RickshawController(RickshawService service, AssignmentService assignments, CardService cards) {
        this.service = service;
        this.assignments = assignments;
        this.cards = cards;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<RickshawResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String thana,
            @RequestParam(required = false) RickshawStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "registeredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(service.search(q, thana, status, from, to, pageable), this::toResponse);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public RickshawResponse get(@PathVariable Long id) {
        return toResponse(service.get(id));
    }

    @GetMapping("/by-number/{number}")
    @Transactional(readOnly = true)
    public RickshawResponse getByNumber(@PathVariable String number) {
        return toResponse(service.getByNumber(number));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public RickshawResponse create(@Valid @RequestBody RickshawRequest req) {
        return toResponse(service.create(req));
    }

    @PutMapping("/{id}")
    @Transactional
    public RickshawResponse update(@PathVariable Long id, @Valid @RequestBody RickshawRequest req) {
        return toResponse(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public RickshawResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return toResponse(service.updateStatus(id, req.status(), req.reason()));
    }

    @GetMapping("/{id}/assignments")
    @Transactional(readOnly = true)
    public List<AssignmentResponse> history(@PathVariable Long id) {
        return assignments.history(service.get(id)).stream().map(AssignmentResponse::from).toList();
    }

    @PostMapping("/{id}/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AssignmentResponse reassign(@PathVariable Long id, @Valid @RequestBody AssignRequest req) {
        return AssignmentResponse.from(service.reassign(id, req.driverId()));
    }

    @GetMapping(value = "/{id}/card.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> card(@PathVariable Long id) {
        Rickshaw r = service.get(id);
        byte[] pdf = cards.render(r, assignments.currentDriverOf(r));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename("card-" + r.getRickshawNumber() + ".pdf").build().toString())
                .body(pdf);
    }

    private RickshawResponse toResponse(Rickshaw r) {
        return RickshawResponse.from(r, assignments.currentDriverOf(r));
    }
}
