package bd.dhaka.dars.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "photo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo {

    @Id
    private UUID id;

    /** Storage key relative to the storage root. */
    private String path;
    private String contentType;
    private long sizeBytes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private AppUser uploadedBy;

    private Instant uploadedAt = Instant.now();

    public Photo(UUID id, String path, String contentType, long sizeBytes, AppUser uploadedBy) {
        this.id = id;
        this.path = path;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.uploadedBy = uploadedBy;
    }
}
