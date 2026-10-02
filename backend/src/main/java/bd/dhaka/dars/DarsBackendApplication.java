package bd.dhaka.dars;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DarsBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DarsBackendApplication.class, args);
    }
}
