package bd.dhaka.dars.controller;

import bd.dhaka.dars.config.DarsProperties;
import bd.dhaka.dars.dto.ComplaintDtos.PublicComplaintRequest;
import bd.dhaka.dars.dto.ComplaintDtos.PublicComplaintResponse;
import bd.dhaka.dars.security.PublicRateLimiter;
import bd.dhaka.dars.service.ComplaintService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated complaint form and status lookup (FR-14). Rate limited per client IP. Responses never
 * contain personal data: only the complaint number, status, filing date and resolution note.
 */
@RestController
@RequestMapping("/api/v1/public/complaints")
public class PublicComplaintController {

    private final ComplaintService service;
    private final PublicRateLimiter limiter;
    private final DarsProperties props;

    public PublicComplaintController(ComplaintService service, PublicRateLimiter limiter, DarsProperties props) {
        this.service = service;
        this.limiter = limiter;
        this.props = props;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PublicComplaintResponse file(@Valid @RequestBody PublicComplaintRequest req, HttpServletRequest http) {
        limiter.check("complaint", http.getRemoteAddr(), props.publicLimits().complaintsPerHour());
        return PublicComplaintResponse.from(service.fileFromPublic(req));
    }

    @GetMapping("/{complaintNo}")
    @Transactional(readOnly = true)
    public PublicComplaintResponse status(@PathVariable String complaintNo, @RequestParam String phone,
                                          HttpServletRequest http) {
        limiter.check("lookup", http.getRemoteAddr(), props.publicLimits().lookupsPerHour());
        return PublicComplaintResponse.from(service.lookup(complaintNo, phone));
    }
}
