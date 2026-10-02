package bd.dhaka.dars.driver;

import bd.dhaka.dars.common.Address;
import bd.dhaka.dars.storage.Photo;
import bd.dhaka.dars.user.AppUser;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "driver")
@Getter
@Setter
@NoArgsConstructor
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String driverCode;
    private String fullName;
    private String fatherName;
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String nid;
    private String licenceNo;
    private String mobile;

    @Embedded
    @AttributeOverride(name = "division", column = @Column(name = "present_division"))
    @AttributeOverride(name = "district", column = @Column(name = "present_district"))
    @AttributeOverride(name = "thana", column = @Column(name = "present_thana"))
    @AttributeOverride(name = "line", column = @Column(name = "present_line"))
    private Address presentAddress;

    @Embedded
    @AttributeOverride(name = "division", column = @Column(name = "permanent_division"))
    @AttributeOverride(name = "district", column = @Column(name = "permanent_district"))
    @AttributeOverride(name = "thana", column = @Column(name = "permanent_thana"))
    @AttributeOverride(name = "line", column = @Column(name = "permanent_line"))
    private Address permanentAddress;

    private String bloodGroup;
    private String emergencyName;
    private String emergencyPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_id")
    private Photo photo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nid_front_id")
    private Photo nidFront;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nid_back_id")
    private Photo nidBack;

    @Enumerated(EnumType.STRING)
    private DriverStatus status = DriverStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by")
    private AppUser registeredBy;

    private Instant registeredAt;
    private Instant updatedAt;
}
