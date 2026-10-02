package bd.dhaka.dars.dto;

import bd.dhaka.dars.dto.UserDtos.UserRef;
import bd.dhaka.dars.entity.Address;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.DriverStatus;
import bd.dhaka.dars.entity.Gender;
import bd.dhaka.dars.entity.Photo;
import bd.dhaka.dars.validation.Adult;
import bd.dhaka.dars.validation.Patterns;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class DriverDtos {

    private DriverDtos() {
    }

    /** Driver registration form (FR-3). */
    public record DriverRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Size(max = 100) String fatherName,
            @NotNull @Past @Adult LocalDate dateOfBirth,
            @NotNull Gender gender,
            @NotBlank @Pattern(regexp = Patterns.NID, message = "must be 10 or 17 digits") String nid,
            @Size(max = 30) @Pattern(regexp = "^[A-Za-z0-9-]*$", message = "must be alphanumeric") String licenceNo,
            @NotBlank @Pattern(regexp = Patterns.MOBILE, message = "must be a valid mobile number like 01712345678")
            String mobile,
            @NotNull @Valid Address presentAddress,
            @NotNull @Valid Address permanentAddress,
            @Pattern(regexp = Patterns.BLOOD_GROUP, message = "must be like A+, O-, AB+") String bloodGroup,
            @Size(max = 100) String emergencyName,
            @Pattern(regexp = Patterns.MOBILE, message = "must be a valid mobile number") String emergencyPhone,
            @NotNull UUID photoId,
            UUID nidFrontId,
            UUID nidBackId) {

        public DriverRequest {
            fullName = trim(fullName);
            fatherName = trim(fatherName);
            nid = trim(nid);
            licenceNo = blankToNull(licenceNo);
            mobile = trim(mobile);
            bloodGroup = blankToNull(bloodGroup);
            emergencyName = blankToNull(emergencyName);
            emergencyPhone = blankToNull(emergencyPhone);
        }
    }

    public record StatusRequest(@NotNull DriverStatus status, @Size(max = 500) String reason) {
    }

    public record RickshawRef(Long id, String rickshawNumber) {
    }

    public record DriverResponse(
            Long id, String driverCode, String fullName, String fatherName, LocalDate dateOfBirth, Gender gender,
            String nid, String licenceNo, String mobile, Address presentAddress, Address permanentAddress,
            String bloodGroup, String emergencyName, String emergencyPhone,
            UUID photoId, UUID nidFrontId, UUID nidBackId,
            DriverStatus status, RickshawRef currentRickshaw, UserRef registeredBy, Instant registeredAt,
            Instant updatedAt) {

        public static DriverResponse from(Driver d, RickshawRef currentRickshaw) {
            return new DriverResponse(d.getId(), d.getDriverCode(), d.getFullName(), d.getFatherName(),
                    d.getDateOfBirth(), d.getGender(), d.getNid(), d.getLicenceNo(), d.getMobile(),
                    d.getPresentAddress(), d.getPermanentAddress(), d.getBloodGroup(), d.getEmergencyName(),
                    d.getEmergencyPhone(), idOf(d.getPhoto()), idOf(d.getNidFront()), idOf(d.getNidBack()),
                    d.getStatus(), currentRickshaw, UserRef.from(d.getRegisteredBy()), d.getRegisteredAt(),
                    d.getUpdatedAt());
        }
    }

    /** Compact driver view embedded in rickshaw responses and lists. */
    public record DriverSummary(Long id, String driverCode, String fullName, String nid, String mobile,
                                UUID photoId, DriverStatus status) {

        public static DriverSummary from(Driver d) {
            return d == null ? null : new DriverSummary(d.getId(), d.getDriverCode(), d.getFullName(), d.getNid(),
                    d.getMobile(), idOf(d.getPhoto()), d.getStatus());
        }
    }

    public record NidCheckResponse(boolean exists, DriverSummary driver) {
    }

    static UUID idOf(Photo p) {
        return p == null ? null : p.getId();
    }

    static String trim(String s) {
        return s == null ? null : s.trim();
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
