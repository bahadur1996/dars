package bd.dhaka.dars.dto;

import bd.dhaka.dars.dto.ComplaintDtos.ComplaintRef;
import bd.dhaka.dars.dto.DriverDtos.DriverSummary;
import bd.dhaka.dars.dto.RickshawDtos.RickshawRef;
import bd.dhaka.dars.dto.UserDtos.UserRef;
import bd.dhaka.dars.entity.CaseFile;
import bd.dhaka.dars.entity.CaseStatus;
import bd.dhaka.dars.entity.Photo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CaseDtos {

    private CaseDtos() {
    }

    /**
     * Files a case (FR-15). At least one of {@code rickshawId} / {@code driverId} is required; when
     * {@code complaintId} is given, missing targets are taken from that complaint.
     */
    public record CaseRequest(
            Long rickshawId,
            Long driverId,
            Long complaintId,
            @NotBlank @Size(max = 200) String offence,
            @NotBlank @Size(max = 2000) String description,
            @NotNull @PastOrPresent Instant incidentAt,
            @NotBlank @Size(max = 50) String thana,
            @Size(max = 3, message = "at most 3 evidence photos") List<UUID> evidencePhotoIds) {

        public CaseRequest {
            offence = DriverDtos.trim(offence);
            description = DriverDtos.trim(description);
            thana = DriverDtos.trim(thana);
            evidencePhotoIds = evidencePhotoIds == null ? List.of() : List.copyOf(evidencePhotoIds);
        }
    }

    public record CaseStatusRequest(@NotNull CaseStatus status, @NotBlank @Size(max = 1000) String note) {

        public CaseStatusRequest {
            note = DriverDtos.trim(note);
        }
    }

    public record CaseResponse(
            Long id, String caseNo, RickshawRef rickshaw, DriverSummary driver, ComplaintRef complaint,
            String offence, String description, Instant incidentAt, String thana, CaseStatus status,
            String resolutionNote, List<UUID> evidencePhotoIds, UserRef filedBy, Instant filedAt,
            Instant updatedAt, Instant closedAt) {

        public static CaseResponse from(CaseFile c) {
            return new CaseResponse(c.getId(), c.getCaseNo(), RickshawRef.from(c.getRickshaw()),
                    DriverSummary.from(c.getDriver()), ComplaintRef.from(c.getComplaint()), c.getOffence(),
                    c.getDescription(), c.getIncidentAt(), c.getThana(), c.getStatus(), c.getResolutionNote(),
                    c.getEvidence().stream().map(Photo::getId).toList(), UserRef.from(c.getFiledBy()),
                    c.getFiledAt(), c.getUpdatedAt(), c.getClosedAt());
        }
    }

    public record CaseRef(Long id, String caseNo, CaseStatus status) {

        public static CaseRef from(CaseFile c) {
            return c == null ? null : new CaseRef(c.getId(), c.getCaseNo(), c.getStatus());
        }
    }
}
