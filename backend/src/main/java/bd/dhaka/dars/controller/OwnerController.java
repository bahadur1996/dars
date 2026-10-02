package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.OwnerDtos.OwnerRequest;
import bd.dhaka.dars.dto.OwnerDtos.OwnerResponse;
import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.service.OwnerService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owners")
public class OwnerController {

    private final OwnerService service;

    public OwnerController(OwnerService service) {
        this.service = service;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<OwnerResponse> search(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(service.search(q, pageable), OwnerResponse::from);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public OwnerResponse get(@PathVariable Long id) {
        return OwnerResponse.from(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public OwnerResponse create(@Valid @RequestBody OwnerRequest req) {
        return OwnerResponse.from(service.create(req));
    }

    @PutMapping("/{id}")
    @Transactional
    public OwnerResponse update(@PathVariable Long id, @Valid @RequestBody OwnerRequest req) {
        return OwnerResponse.from(service.update(id, req));
    }
}
