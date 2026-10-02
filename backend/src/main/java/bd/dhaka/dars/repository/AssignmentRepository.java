package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Assignment;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.Rickshaw;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    @EntityGraph(attributePaths = "driver")
    Optional<Assignment> findFirstByRickshawAndToDateIsNull(Rickshaw rickshaw);

    @EntityGraph(attributePaths = "rickshaw")
    Optional<Assignment> findFirstByDriverAndToDateIsNull(Driver driver);

    @EntityGraph(attributePaths = {"driver", "assignedBy"})
    List<Assignment> findByRickshawOrderByFromDateDesc(Rickshaw rickshaw);
}
