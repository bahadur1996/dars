package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Owner;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OwnerRepository extends JpaRepository<Owner, Long>, JpaSpecificationExecutor<Owner> {

    Optional<Owner> findByNid(String nid);
}
