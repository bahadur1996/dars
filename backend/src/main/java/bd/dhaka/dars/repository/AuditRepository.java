package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRepository extends JpaRepository<AuditLog, Long> {

    @EntityGraph(attributePaths = "actor")
    Page<AuditLog> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = "actor")
    Page<AuditLog> findByEntity(String entity, Pageable pageable);
}
