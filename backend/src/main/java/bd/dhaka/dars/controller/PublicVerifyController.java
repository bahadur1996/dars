package bd.dhaka.dars.controller;

import bd.dhaka.dars.entity.Photo;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.entity.RickshawStatus;
import bd.dhaka.dars.exception.ApiException;
import bd.dhaka.dars.repository.RickshawRepository;
import bd.dhaka.dars.service.PhotoService;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated QR verification. Deliberately exposes only the vehicle number, status,
 * registration date and the vehicle photo: no driver/owner personal data.
 */
@RestController
@RequestMapping("/api/v1/public/verify")
public class PublicVerifyController {

    private final RickshawRepository rickshaws;
    private final PhotoService photos;

    public PublicVerifyController(RickshawRepository rickshaws, PhotoService photos) {
        this.rickshaws = rickshaws;
        this.photos = photos;
    }

    public record VerifyResponse(String rickshawNumber, RickshawStatus status, Instant registeredAt,
                                 String photoUrl) {
    }

    @GetMapping("/{number}")
    @Transactional(readOnly = true)
    public VerifyResponse verify(@PathVariable String number) {
        Rickshaw r = find(number);
        return new VerifyResponse(r.getRickshawNumber(), r.getStatus(), r.getRegisteredAt(),
                "/api/v1/public/verify/" + r.getRickshawNumber() + "/photo");
    }

    @GetMapping("/{number}/photo")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> photo(@PathVariable String number) {
        Photo p = find(number).getPhoto();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(p.getContentType()))
                .body(photos.content(p));
    }

    private Rickshaw find(String number) {
        return rickshaws.findByRickshawNumber(number.trim().toUpperCase())
                .orElseThrow(() -> ApiException.notFound("Rickshaw", number));
    }
}
