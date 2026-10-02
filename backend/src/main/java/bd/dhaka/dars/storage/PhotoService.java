package bd.dhaka.dars.storage;

import bd.dhaka.dars.common.ApiException;
import bd.dhaka.dars.user.CurrentUser;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PhotoService {

    static final long MAX_BYTES = 2 * 1024 * 1024;

    private final PhotoRepository photos;
    private final StorageService storage;
    private final CurrentUser currentUser;

    public PhotoService(PhotoRepository photos, StorageService storage, CurrentUser currentUser) {
        this.photos = photos;
        this.storage = storage;
        this.currentUser = currentUser;
    }

    @Transactional
    public Photo upload(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (bytes.length == 0) {
            throw ApiException.badRequest("EMPTY_FILE", "File is empty");
        }
        if (bytes.length > MAX_BYTES) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE", "File exceeds the 2 MB limit");
        }
        // Trust the bytes, not the client-declared content type.
        String contentType = detectImageType(bytes);
        if (contentType == null) {
            throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE", "Only JPEG and PNG images are allowed");
        }
        UUID id = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        String ext = contentType.equals("image/png") ? ".png" : ".jpg";
        String key = "%d/%02d/%s%s".formatted(today.getYear(), today.getMonthValue(), id, ext);
        storage.put(key, bytes);
        return photos.save(new Photo(id, key, contentType, bytes.length, currentUser.get()));
    }

    @Transactional(readOnly = true)
    public Photo get(UUID id) {
        return photos.findById(id).orElseThrow(() -> ApiException.notFound("Photo", id));
    }

    /** Validates that a referenced photo exists; used by services that attach photos to records. */
    @Transactional(readOnly = true)
    public Photo require(UUID id, String field) {
        if (id == null) {
            return null;
        }
        return photos.findById(id).orElseThrow(() -> ApiException.badRequest("INVALID_PHOTO",
                field + " refers to an unknown photo"));
    }

    public byte[] content(Photo photo) {
        return storage.get(photo.getPath());
    }

    static String detectImageType(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }
        return null;
    }
}
