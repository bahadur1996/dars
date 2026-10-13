package bd.dhaka.dars.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A complaint filed by a member of the public against a rickshaw and its driver (FR-14). */
@Entity
@Table(name = "complaint")
@Getter
@Setter
@NoArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String complaintNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rickshaw_id")
    private Rickshaw rickshaw;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    private String complainantName;
    private String complainantPhone;
    private String complainantNid;

    @Enumerated(EnumType.STRING)
    private ComplaintCategory category;

    private String description;
    private Instant incidentAt;
    private String thana;

    @Enumerated(EnumType.STRING)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    private String resolutionNote;

    /** The officer who last changed the status; null while untouched. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private AppUser handledBy;

    private Instant filedAt;
    private Instant updatedAt;
}
