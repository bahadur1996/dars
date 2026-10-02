package bd.dhaka.dars.validation;

/** Validation patterns shared by request DTOs (mirrored in the web and mobile Zod schemas). */
public final class Patterns {

    /** Bangladesh NID: 10 digits (smart card) or 17 digits (old format). */
    public static final String NID = "^(\\d{10}|\\d{17})$";
    /** Bangladesh mobile number, e.g. 01712345678. */
    public static final String MOBILE = "^01[3-9]\\d{8}$";
    /** Rickshaw number: uppercase letters, digits and dashes. */
    public static final String RICKSHAW_NUMBER = "^[A-Z0-9-]{3,20}$";
    public static final String BLOOD_GROUP = "^(A|B|AB|O)[+-]$";

    private Patterns() {
    }
}
