package bd.dhaka.dars.owner;

import bd.dhaka.dars.common.Address;
import bd.dhaka.dars.common.Patterns;
import bd.dhaka.dars.user.UserDtos.UserRef;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class OwnerDtos {

    private OwnerDtos() {
    }

    public record OwnerRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Pattern(regexp = Patterns.NID, message = "must be 10 or 17 digits") String nid,
            @NotBlank @Pattern(regexp = Patterns.MOBILE, message = "must be a valid mobile number like 01712345678")
            String mobile,
            @NotNull @Valid Address address) {

        public OwnerRequest {
            fullName = fullName == null ? null : fullName.trim();
            nid = nid == null ? null : nid.trim();
            mobile = mobile == null ? null : mobile.trim();
        }
    }

    public record OwnerResponse(Long id, String fullName, String nid, String mobile, Address address,
                                UserRef createdBy, Instant createdAt) {

        public static OwnerResponse from(Owner o) {
            return o == null ? null : new OwnerResponse(o.getId(), o.getFullName(), o.getNid(), o.getMobile(),
                    o.getAddress(), UserRef.from(o.getCreatedBy()), o.getCreatedAt());
        }
    }
}
