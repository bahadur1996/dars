package bd.dhaka.dars.entity;

import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Embeddable
public record Address(
        @NotBlank @Size(max = 50) String division,
        @NotBlank @Size(max = 50) String district,
        @NotBlank @Size(max = 50) String thana,
        @NotBlank @Size(max = 200) String line) {
}
