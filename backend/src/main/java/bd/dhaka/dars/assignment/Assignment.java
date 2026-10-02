package bd.dhaka.dars.assignment;

import bd.dhaka.dars.driver.Driver;
import bd.dhaka.dars.rickshaw.Rickshaw;
import bd.dhaka.dars.user.AppUser;
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

/** A driver driving a rickshaw for a period; {@code toDate == null} means currently active. */
@Entity
@Table(name = "assignment")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rickshaw_id")
    private Rickshaw rickshaw;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    private Instant fromDate;
    private Instant toDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private AppUser assignedBy;

    public Assignment(Rickshaw rickshaw, Driver driver, AppUser assignedBy) {
        this.rickshaw = rickshaw;
        this.driver = driver;
        this.assignedBy = assignedBy;
        this.fromDate = Instant.now();
    }
}
