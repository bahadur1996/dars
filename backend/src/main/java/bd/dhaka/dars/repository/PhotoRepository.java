package bd.dhaka.dars.repository;

import bd.dhaka.dars.entity.Photo;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
}
