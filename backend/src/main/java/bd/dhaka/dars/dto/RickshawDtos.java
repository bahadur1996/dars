package bd.dhaka.dars.dto;

import bd.dhaka.dars.dto.OwnerDtos.OwnerResponse;
import bd.dhaka.dars.dto.UserDtos.UserRef;
import bd.dhaka.dars.entity.Ownership;
import bd.dhaka.dars.entity.Photo;
import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.entity.RickshawStatus;
import bd.dhaka.dars.validation.Patterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class RickshawDtos {

    private RickshawDtos() {
    }

    /**
     * Rickshaw registration (FR-5). Leave {@code rickshawNumber} blank to have DARS issue one.
     * {@code ownerId} is required on create and ignored on update; use the ownership endpoint to transfer (FR-13).
     */
    public record RickshawRequest(
            @Pattern(regexp = Patterns.RICKSHAW_NUMBER,
                    message = "must be 3-20 characters: letters, digits or dashes") String rickshawNumber,
            @Size(max = 50) String chassisNo,
            @Size(max = 50) String motorNo,
            @Size(max = 30) String color,
            @Size(max = 50) String model,
            @NotBlank @Size(max = 50) String thana,
            @NotNull UUID photoId,
            UUID rearPhotoId,
            Long ownerId) {

        public RickshawRequest {
            rickshawNumber = rickshawNumber == null || rickshawNumber.isBlank()
                    ? null : rickshawNumber.trim().toUpperCase();
            chassisNo = blankToNull(chassisNo);
            motorNo = blankToNull(motorNo);
            color = blankToNull(color);
            model = blankToNull(model);
            thana = thana == null ? null : thana.trim();
        }

        private static String blankToNull(String s) {
            return s == null || s.isBlank() ? null : s.trim();
        }
    }

    /** FR-13: hand the rickshaw over to another registered owner. */
    public record TransferRequest(@NotNull Long ownerId, @Size(max = 500) String note) {

        public TransferRequest {
            note = note == null || note.isBlank() ? null : note.trim();
        }
    }

    public record StatusRequest(@NotNull RickshawStatus status, @Size(max = 500) String reason) {
    }

    public record RickshawResponse(
            Long id, String rickshawNumber, String chassisNo, String motorNo, String color, String model,
            String thana, UUID photoId, UUID rearPhotoId, RickshawStatus status, OwnerResponse owner,
            UserRef registeredBy, Instant registeredAt, Instant updatedAt) {

        public static RickshawResponse from(Rickshaw r) {
            return new RickshawResponse(r.getId(), r.getRickshawNumber(), r.getChassisNo(), r.getMotorNo(),
                    r.getColor(), r.getModel(), r.getThana(), idOf(r.getPhoto()), idOf(r.getRearPhoto()),
                    r.getStatus(), OwnerResponse.from(r.getOwner()), UserRef.from(r.getRegisteredBy()),
                    r.getRegisteredAt(), r.getUpdatedAt());
        }
    }

    /** Compact rickshaw reference embedded in complaint and case responses. */
    public record RickshawRef(Long id, String rickshawNumber) {

        public static RickshawRef from(Rickshaw r) {
            return r == null ? null : new RickshawRef(r.getId(), r.getRickshawNumber());
        }
    }

    public record OwnershipResponse(Long id, OwnerResponse owner, Instant fromDate, Instant toDate,
                                    UserRef changedBy, String note) {

        public static OwnershipResponse from(Ownership o) {
            return new OwnershipResponse(o.getId(), OwnerResponse.from(o.getOwner()), o.getFromDate(),
                    o.getToDate(), UserRef.from(o.getChangedBy()), o.getNote());
        }
    }

    private static UUID idOf(Photo p) {
        return p == null ? null : p.getId();
    }
}
