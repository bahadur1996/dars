package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.CaseFile;
import bd.dhaka.dars.entity.CaseStatus;
import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.Rickshaw;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface CaseRepository extends JpaRepository<CaseFile, Long>, JpaSpecificationExecutor<CaseFile> {

    Optional<CaseFile> findFirstByComplaint(Complaint complaint);

    List<CaseFile> findByRickshawOrderByFiledAtDesc(Rickshaw rickshaw);

    List<CaseFile> findByDriverOrderByFiledAtDesc(Driver driver);

    long countByStatusIn(Collection<CaseStatus> statuses);

    @Query(value = "select nextval('case_no_seq')", nativeQuery = true)
    long nextNumberValue();
}
