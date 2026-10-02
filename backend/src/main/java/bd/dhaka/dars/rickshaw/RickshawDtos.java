package bd.dhaka.dars.rickshaw;

import bd.dhaka.dars.assignment.Assignment;
import bd.dhaka.dars.common.Patterns;
import bd.dhaka.dars.driver.Driver;
import bd.dhaka.dars.driver.DriverDtos.DriverSummary;
import bd.dhaka.dars.owner.OwnerDtos.OwnerResponse;
import bd.dhaka.dars.storage.Photo;
import bd.dhaka.dars.user.UserDtos.UserRef;
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
     * {@code driverId} is used on create only; use the assignments endpoint to reassign.
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
            @NotNull Long ownerId,
            Long driverId) {

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

    public record AssignRequest(@NotNull Long driverId) {
    }

    public record StatusRequest(@NotNull RickshawStatus status, @Size(max = 500) String reason) {
    }

    public record RickshawResponse(
            Long id, String rickshawNumber, String chassisNo, String motorNo, String color, String model,
            String thana, UUID photoId, UUID rearPhotoId, RickshawStatus status, OwnerResponse owner,
            DriverSummary currentDriver, UserRef registeredBy, Instant registeredAt, Instant updatedAt) {

        public static RickshawResponse from(Rickshaw r, Driver currentDriver) {
            return new RickshawResponse(r.getId(), r.getRickshawNumber(), r.getChassisNo(), r.getMotorNo(),
                    r.getColor(), r.getModel(), r.getThana(), idOf(r.getPhoto()), idOf(r.getRearPhoto()),
                    r.getStatus(), OwnerResponse.from(r.getOwner()), DriverSummary.from(currentDriver),
                    UserRef.from(r.getRegisteredBy()), r.getRegisteredAt(), r.getUpdatedAt());
        }
    }

    public record AssignmentResponse(Long id, DriverSummary driver, Instant fromDate, Instant toDate,
                                     UserRef assignedBy) {

        public static AssignmentResponse from(Assignment a) {
            return new AssignmentResponse(a.getId(), DriverSummary.from(a.getDriver()), a.getFromDate(),
                    a.getToDate(), UserRef.from(a.getAssignedBy()));
        }
    }

    private static UUID idOf(Photo p) {
        return p == null ? null : p.getId();
    }
}
