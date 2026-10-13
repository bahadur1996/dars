package bd.dhaka.dars.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** An owner holding a rickshaw for a period; {@code toDate == null} means the current owner (FR-13). */
@Entity
@Table(name = "ownership")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ownership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rickshaw_id")
    private Rickshaw rickshaw;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private Owner owner;

    private Instant fromDate;
    private Instant toDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private AppUser changedBy;

    private String note;

    public Ownership(Rickshaw rickshaw, Owner owner, AppUser changedBy, String note) {
        this.rickshaw = rickshaw;
        this.owner = owner;
        this.changedBy = changedBy;
        this.note = note;
        this.fromDate = Instant.now();
    }
}
