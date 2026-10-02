package bd.dhaka.dars.assignment;

import bd.dhaka.dars.driver.Driver;
import bd.dhaka.dars.rickshaw.Rickshaw;
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
