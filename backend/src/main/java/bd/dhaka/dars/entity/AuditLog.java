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

@Entity
@Table(name = "audit_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private AppUser actor;

    private String action;
    private String entity;
    private String entityId;
    private String details;
    private Instant at = Instant.now();

    public AuditLog(AppUser actor, String action, String entity, String entityId, String details) {
        this.actor = actor;
        this.action = action;
        this.entity = entity;
        this.entityId = entityId;
        this.details = details == null || details.length() <= 1000 ? details : details.substring(0, 1000);
    }
}
