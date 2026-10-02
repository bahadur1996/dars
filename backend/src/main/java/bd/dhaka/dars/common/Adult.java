package bd.dhaka.dars.common;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.LocalDate;

/** The annotated date of birth must be at least 18 years ago. Null is treated as valid. */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = Adult.Validator.class)
public @interface Adult {

    String message() default "must be at least 18 years old";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<Adult, LocalDate> {
        @Override
        public boolean isValid(LocalDate dob, ConstraintValidatorContext ctx) {
            return dob == null || !dob.plusYears(18).isAfter(LocalDate.now());
        }
    }
}
