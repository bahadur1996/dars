package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Driver;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface DriverRepository extends JpaRepository<Driver, Long>, JpaSpecificationExecutor<Driver> {

    Optional<Driver> findByNid(String nid);

    Optional<Driver> findByDriverCode(String driverCode);

    @Query(value = "select nextval('driver_code_seq')", nativeQuery = true)
    long nextCodeValue();
}
