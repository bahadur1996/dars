package bd.dhaka.dars.config;

import bd.dhaka.dars.entity.AppUser;
import bd.dhaka.dars.entity.Role;
import bd.dhaka.dars.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the initial admin account on first boot. */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final DarsProperties props;

    public DataSeeder(UserRepository users, PasswordEncoder encoder, DarsProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        DarsProperties.Admin admin = props.admin();
        users.save(new AppUser(admin.username(), encoder.encode(admin.password()), admin.fullName(), Role.ADMIN));
        log.info("Seeded admin user '{}'", admin.username());
    }
}
