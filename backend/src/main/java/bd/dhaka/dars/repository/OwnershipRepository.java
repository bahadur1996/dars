package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Ownership;
import bd.dhaka.dars.entity.Rickshaw;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnershipRepository extends JpaRepository<Ownership, Long> {

    Optional<Ownership> findFirstByRickshawAndToDateIsNull(Rickshaw rickshaw);

    @EntityGraph(attributePaths = {"owner", "changedBy"})
    List<Ownership> findByRickshawOrderByFromDateDescIdDesc(Rickshaw rickshaw);
}
