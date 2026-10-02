package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Rickshaw;
import bd.dhaka.dars.entity.RickshawStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface RickshawRepository extends JpaRepository<Rickshaw, Long>, JpaSpecificationExecutor<Rickshaw> {

    Optional<Rickshaw> findByRickshawNumber(String rickshawNumber);

    boolean existsByRickshawNumber(String rickshawNumber);

    long countByStatus(RickshawStatus status);

    @Query(value = "select nextval('rickshaw_number_seq')", nativeQuery = true)
    long nextNumberValue();

    @Query("select r.registeredAt from Rickshaw r where r.registeredAt >= :since")
    List<Instant> registeredSince(Instant since);

    @Query("select r.thana, count(r) from Rickshaw r group by r.thana order by count(r) desc")
    List<Object[]> countByThana();

    @Query("select r.registeredBy.fullName, count(r) from Rickshaw r group by r.registeredBy.fullName "
            + "order by count(r) desc")
    List<Object[]> countByOfficer();
}
