package bd.dhaka.dars.dto;

import bd.dhaka.dars.dto.CaseDtos.CaseRef;
import bd.dhaka.dars.dto.DriverDtos.DriverSummary;
import bd.dhaka.dars.dto.RickshawDtos.RickshawRef;
import bd.dhaka.dars.dto.UserDtos.UserRef;
import bd.dhaka.dars.entity.CaseFile;
import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.ComplaintCategory;
import bd.dhaka.dars.entity.ComplaintStatus;
import bd.dhaka.dars.validation.Patterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ComplaintDtos {

    private ComplaintDtos() {
    }

    /**
     * Public complaint form (FR-14). {@code website} is a honeypot: real users never see or fill it,
     * so a non-blank value marks the submission as a bot.
     */
    public record PublicComplaintRequest(
            @NotBlank @Size(max = 20) String rickshawNumber,
            @NotBlank @Size(max = 20) String driverCode,
            @NotBlank @Size(max = 100) String complainantName,
            @NotBlank @Pattern(regexp = Patterns.MOBILE, message = "must be a valid mobile number like 01712345678")
            String complainantPhone,
            @NotBlank @Pattern(regexp = Patterns.NID, message = "must be 10 or 17 digits") String complainantNid,
            ComplaintCategory category,
            @NotBlank @Size(max = 2000) String description,
            @PastOrPresent Instant incidentAt,
            @Size(max = 50) String thana,
            String website) {

        public PublicComplaintRequest {
            rickshawNumber = rickshawNumber == null ? null : rickshawNumber.trim().toUpperCase();
            driverCode = driverCode == null ? null : driverCode.trim().toUpperCase();
            complainantName = DriverDtos.trim(complainantName);
            complainantPhone = DriverDtos.trim(complainantPhone);
            complainantNid = DriverDtos.trim(complainantNid);
            category = category == null ? ComplaintCategory.OTHER : category;
            description = DriverDtos.trim(description);
            thana = DriverDtos.blankToNull(thana);
        }
    }

    /** Officer decision on an open complaint. ESCALATED is only reached by filing a case (FR-15). */
    public record ComplaintStatusRequest(@NotNull ComplaintStatus status, @NotBlank @Size(max = 1000) String note) {

        public ComplaintStatusRequest {
            note = DriverDtos.trim(note);
        }
    }

    /** What the complainant may see: no personal data, no officer names. */
    public record PublicComplaintResponse(String complaintNo, ComplaintStatus status, Instant filedAt,
                                          String resolutionNote) {

        public static PublicComplaintResponse from(Complaint c) {
            return new PublicComplaintResponse(c.getComplaintNo(), c.getStatus(), c.getFiledAt(),
                    c.getResolutionNote());
        }
    }

    public record ComplaintResponse(
            Long id, String complaintNo, RickshawRef rickshaw, DriverSummary driver, String complainantName,
            String complainantPhone, String complainantNid, ComplaintCategory category, String description,
            Instant incidentAt, String thana, ComplaintStatus status, String resolutionNote, CaseRef caseFile,
            UserRef handledBy, Instant filedAt, Instant updatedAt) {

        public static ComplaintResponse from(Complaint c, CaseFile escalatedTo) {
            return new ComplaintResponse(c.getId(), c.getComplaintNo(), RickshawRef.from(c.getRickshaw()),
                    DriverSummary.from(c.getDriver()), c.getComplainantName(), c.getComplainantPhone(),
                    c.getComplainantNid(), c.getCategory(), c.getDescription(), c.getIncidentAt(), c.getThana(),
                    c.getStatus(), c.getResolutionNote(), CaseRef.from(escalatedTo), UserRef.from(c.getHandledBy()),
                    c.getFiledAt(), c.getUpdatedAt());
        }
    }

    public record ComplaintRef(Long id, String complaintNo) {

        public static ComplaintRef from(Complaint c) {
            return c == null ? null : new ComplaintRef(c.getId(), c.getComplaintNo());
        }
    }
}
