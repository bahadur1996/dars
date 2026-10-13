package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Complaint;
import bd.dhaka.dars.entity.ComplaintStatus;
import bd.dhaka.dars.entity.Driver;
import bd.dhaka.dars.entity.Rickshaw;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {

    Optional<Complaint> findByComplaintNo(String complaintNo);

    List<Complaint> findByRickshawOrderByFiledAtDesc(Rickshaw rickshaw);

    List<Complaint> findByDriverOrderByFiledAtDesc(Driver driver);

    long countByStatus(ComplaintStatus status);

    @Query(value = "select nextval('complaint_no_seq')", nativeQuery = true)
    long nextNumberValue();
}
