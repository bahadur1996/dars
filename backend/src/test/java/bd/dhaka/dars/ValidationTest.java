package bd.dhaka.dars;

import static org.assertj.core.api.Assertions.assertThat;

import bd.dhaka.dars.common.Address;
import bd.dhaka.dars.driver.DriverDtos.DriverRequest;
import bd.dhaka.dars.driver.Gender;
import bd.dhaka.dars.rickshaw.RickshawDtos.RickshawRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private static final Address ADDR = new Address("Dhaka", "Dhaka", "Mirpur", "House 1, Road 2");

    static DriverRequest driver(String nid, String mobile, LocalDate dob) {
        return new DriverRequest("Abdul Karim", "Rahim Uddin", dob, Gender.MALE, nid, null, mobile, ADDR, ADDR,
                null, null, null, UUID.randomUUID(), null, null);
    }

    private Set<String> invalidFields(Object o) {
        return validator.validate(o).stream()
                .map(ConstraintViolation::getPropertyPath).map(Object::toString).collect(Collectors.toSet());
    }

    @Test
    void validDriverPasses() {
        assertThat(invalidFields(driver("1234567890", "01712345678", LocalDate.of(1990, 1, 1)))).isEmpty();
        assertThat(invalidFields(driver("12345678901234567", "01912345678", LocalDate.of(1990, 1, 1)))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"123", "12345678901", "123456789012345678", "12345abcde"})
    void nidMustBe10Or17Digits(String nid) {
        assertThat(invalidFields(driver(nid, "01712345678", LocalDate.of(1990, 1, 1)))).contains("nid");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0171234567", "01212345678", "+8801712345678", "1712345678"})
    void mobileMustBeBangladeshi(String mobile) {
        assertThat(invalidFields(driver("1234567890", mobile, LocalDate.of(1990, 1, 1)))).contains("mobile");
    }

    @Test
    void driverMustBeAdult() {
        LocalDate seventeen = LocalDate.now().minusYears(17);
        LocalDate eighteen = LocalDate.now().minusYears(18);
        assertThat(invalidFields(driver("1234567890", "01712345678", seventeen))).contains("dateOfBirth");
        assertThat(invalidFields(driver("1234567890", "01712345678", eighteen))).doesNotContain("dateOfBirth");
    }

    @Test
    void addressFieldsAreRequired() {
        DriverRequest req = new DriverRequest("A", "B", LocalDate.of(1990, 1, 1), Gender.MALE, "1234567890", null,
                "01712345678", new Address("", "Dhaka", "Mirpur", "x"), ADDR, null, null, null,
                UUID.randomUUID(), null, null);
        assertThat(invalidFields(req)).contains("presentAddress.division");
    }

    @Test
    void rickshawNumberIsNormalisedToUppercase() {
        RickshawRequest req = new RickshawRequest(" dhk-12a ", null, null, null, null, "Mirpur",
                UUID.randomUUID(), null, 1L, 1L);
        assertThat(req.rickshawNumber()).isEqualTo("DHK-12A");
        assertThat(invalidFields(req)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"AB", "DHK 123", "DHK_123", "ঢাকা-১২৩", "ABCDEFGHIJKLMNOPQRSTU"})
    void rickshawNumberMustBeAlphanumeric(String number) {
        RickshawRequest req = new RickshawRequest(number, null, null, null, null, "Mirpur",
                UUID.randomUUID(), null, 1L, 1L);
        assertThat(invalidFields(req)).contains("rickshawNumber");
    }

    @Test
    void blankRickshawNumberMeansAutoIssue() {
        RickshawRequest req = new RickshawRequest("  ", null, null, null, null, "Mirpur",
                UUID.randomUUID(), null, 1L, 1L);
        assertThat(req.rickshawNumber()).isNull();
        assertThat(invalidFields(req)).isEmpty();
    }
}
