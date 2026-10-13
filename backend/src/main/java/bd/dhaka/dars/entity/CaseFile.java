package bd.dhaka.dars.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A formal case against a rickshaw and/or a driver (FR-15). Stored in {@code case_file}: CASE is an SQL keyword. */
@Entity
@Table(name = "case_file")
@Getter
@Setter
@NoArgsConstructor
public class CaseFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String caseNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rickshaw_id")
    private Rickshaw rickshaw;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    /** The complaint this case was escalated from, if any. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id")
    private Complaint complaint;

    private String offence;
    private String description;
    private Instant incidentAt;
    private String thana;

    @Enumerated(EnumType.STRING)
    private CaseStatus status = CaseStatus.OPEN;

    private String resolutionNote;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "case_evidence", joinColumns = @JoinColumn(name = "case_id"),
            inverseJoinColumns = @JoinColumn(name = "photo_id"))
    private List<Photo> evidence = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filed_by")
    private AppUser filedBy;

    private Instant filedAt;
    private Instant updatedAt;
    private Instant closedAt;
}
