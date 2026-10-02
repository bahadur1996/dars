package bd.dhaka.dars;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** End-to-end API flow against an in-memory H2 database. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiFlowIntegrationTest {

    static final byte[] JPEG = tinyJpeg();
    static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired
    MockMvc mvc;

    String adminToken;

    @BeforeEach
    void loginAdmin() throws Exception {
        adminToken = login("admin", "Admin@12345");
    }

    // ---------- helpers ----------

    static byte[] tinyJpeg() {
        try {
            BufferedImage img = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, "jpg", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    String login(String username, String password) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password)))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.accessToken");
    }

    static <B extends AbstractMockHttpServletRequestBuilder<B>> B auth(B b, String token) {
        return b.header("Authorization", "Bearer " + token);
    }

    static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String token, String body) {
        return auth(b, token).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    String createOfficer() throws Exception {
        String username = "officer" + SEQ.incrementAndGet();
        mvc.perform(json(post("/api/v1/users"), adminToken,
                        "{\"username\":\"%s\",\"password\":\"Officer@123\",\"fullName\":\"Officer %s\",\"role\":\"OFFICER\"}"
                                .formatted(username, username)))
                .andExpect(status().isCreated());
        return login(username, "Officer@123");
    }

    String uploadPhoto(String token) throws Exception {
        MvcResult res = mvc.perform(auth(multipart("/api/v1/photos")
                        .file(new MockMultipartFile("file", "p.jpg", "image/jpeg", JPEG)), token))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }

    static String uniqueNid() {
        return "%010d".formatted(1_000_000_000L + System.nanoTime() % 1_000_000_000L);
    }

    String driverJson(String nid, String photoId) {
        String addr = "{\"division\":\"Dhaka\",\"district\":\"Dhaka\",\"thana\":\"Mirpur\",\"line\":\"House 1\"}";
        return """
                {"fullName":"Abdul Karim","fatherName":"Rahim Uddin","dateOfBirth":"1990-05-01","gender":"MALE",
                 "nid":"%s","mobile":"01712345678","presentAddress":%s,"permanentAddress":%s,"photoId":"%s"}
                """.formatted(nid, addr, addr, photoId);
    }

    Integer createDriver(String token, String nid) throws Exception {
        MvcResult res = mvc.perform(json(post("/api/v1/drivers"), token, driverJson(nid, uploadPhoto(token))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.driverCode", startsWith("DRV-")))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }

    Integer createOwner(String token) throws Exception {
        String body = """
                {"fullName":"Owner Mia","nid":"%s","mobile":"01812345678",
                 "address":{"division":"Dhaka","district":"Dhaka","thana":"Mirpur","line":"Road 5"}}
                """.formatted(uniqueNid());
        MvcResult res = mvc.perform(json(post("/api/v1/owners"), token, body))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }

    String rickshawJson(String number, Integer ownerId, Integer driverId, String photoId) {
        String num = number == null ? "null" : "\"" + number + "\"";
        return """
                {"rickshawNumber":%s,"thana":"Mirpur","color":"Green","photoId":"%s","ownerId":%d,"driverId":%d}
                """.formatted(num, photoId, ownerId, driverId);
    }

    // ---------- tests ----------

    @Test
    void protectedEndpointsRequireToken() throws Exception {
        mvc.perform(get("/api/v1/drivers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/rickshaws")).andExpect(status().isUnauthorized());
    }

    @Test
    void officerCannotManageUsersOrViewAudit() throws Exception {
        String officer = createOfficer();
        mvc.perform(auth(get("/api/v1/users"), officer)).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/v1/audit"), officer)).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/v1/users"), adminToken)).andExpect(status().isOk());
    }

    @Test
    void fullRegistrationFlow() throws Exception {
        String officer = createOfficer();

        // Driver + duplicate NID
        String nid = uniqueNid();
        Integer driverId = createDriver(officer, nid);
        mvc.perform(json(post("/api/v1/drivers"), officer, driverJson(nid, uploadPhoto(officer))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NID"));
        mvc.perform(auth(get("/api/v1/drivers/check-nid").param("nid", nid), officer))
                .andExpect(jsonPath("$.exists").value(true));

        // Rickshaw with auto-issued number
        Integer ownerId = createOwner(officer);
        MvcResult res = mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(null, ownerId, driverId, uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rickshawNumber", startsWith("DHK-AR-")))
                .andExpect(jsonPath("$.currentDriver.id").value(driverId))
                .andExpect(jsonPath("$.registeredBy.username", startsWith("officer")))
                .andReturn();
        Integer rickshawId = JsonPath.read(res.getResponse().getContentAsString(), "$.id");
        String number = JsonPath.read(res.getResponse().getContentAsString(), "$.rickshawNumber");

        // Manual number, duplicate number
        Integer driver2 = createDriver(officer, uniqueNid());
        String manual = "MIR-" + SEQ.incrementAndGet() + "X";
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(manual.toLowerCase(), ownerId, driver2, uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rickshawNumber").value(manual));
        Integer driver3 = createDriver(officer, uniqueNid());
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(manual, ownerId, driver3, uploadPhoto(officer))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NUMBER"));

        // A driver can't drive two rickshaws at once
        mvc.perform(json(post("/api/v1/rickshaws/{id}/assignments", rickshawId), officer,
                        "{\"driverId\":" + driver2 + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DRIVER_ALREADY_ASSIGNED"));

        // Reassign to a free driver; history keeps both
        mvc.perform(json(post("/api/v1/rickshaws/{id}/assignments", rickshawId), officer,
                        "{\"driverId\":" + driver3 + "}"))
                .andExpect(status().isCreated());
        mvc.perform(auth(get("/api/v1/rickshaws/{id}/assignments", rickshawId), officer))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].driver.id").value(driver3))
                .andExpect(jsonPath("$[1].toDate").isNotEmpty());
        mvc.perform(auth(get("/api/v1/drivers/{id}", driverId), officer))
                .andExpect(jsonPath("$.currentRickshaw").doesNotExist());

        // Search by number and by the current driver's NID
        mvc.perform(auth(get("/api/v1/rickshaws").param("q", number), officer))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/v1/drivers/{id}", driver3), officer))
                .andExpect(jsonPath("$.currentRickshaw.rickshawNumber").value(number));

        // Card PDF and public verify (no token)
        MvcResult pdf = mvc.perform(auth(get("/api/v1/rickshaws/{id}/card.pdf", rickshawId), officer))
                .andExpect(status().isOk()).andReturn();
        assertThat(new String(pdf.getResponse().getContentAsByteArray(), 0, 4)).isEqualTo("%PDF");
        mvc.perform(get("/api/v1/public/verify/{n}", number))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.currentDriver").doesNotExist());

        // Dashboard + audit
        mvc.perform(auth(get("/api/v1/dashboard/summary"), officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perDay", hasSize(30)));
        mvc.perform(auth(get("/api/v1/audit").param("entity", "rickshaw"), adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].actor.username", startsWith("officer")));
    }

    @Test
    void onlyAdminCanChangeStatus() throws Exception {
        String officer = createOfficer();
        Integer driverId = createDriver(officer, uniqueNid());
        mvc.perform(json(patch("/api/v1/drivers/{id}/status", driverId), officer, "{\"status\":\"SUSPENDED\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(json(patch("/api/v1/drivers/{id}/status", driverId), adminToken, "{\"status\":\"SUSPENDED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
        // A suspended driver cannot be assigned
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(null, createOwner(officer), driverId, uploadPhoto(officer))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DRIVER_NOT_ACTIVE"));
    }

    @Test
    void invalidDriverFormReturnsFieldErrors() throws Exception {
        String body = driverJson("123", uploadPhoto(adminToken)).replace("01712345678", "999");
        mvc.perform(json(post("/api/v1/drivers"), adminToken, body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='nid')]").exists())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='mobile')]").exists());
    }

    @Test
    void nonImageUploadIsRejected() throws Exception {
        mvc.perform(auth(multipart("/api/v1/photos")
                        .file(new MockMultipartFile("file", "x.jpg", "image/jpeg", "not an image".getBytes())),
                        adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE_TYPE"));
    }

    @Test
    void oversizedUploadIsRejected() throws Exception {
        byte[] big = new byte[2 * 1024 * 1024 + 1];
        System.arraycopy(JPEG, 0, big, 0, JPEG.length);
        mvc.perform(auth(multipart("/api/v1/photos")
                        .file(new MockMultipartFile("file", "big.jpg", "image/jpeg", big)), adminToken))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void accountLocksAfterFiveFailedLogins() throws Exception {
        String username = "officer" + SEQ.incrementAndGet();
        mvc.perform(json(post("/api/v1/users"), adminToken,
                "{\"username\":\"%s\",\"password\":\"Officer@123\",\"fullName\":\"X\",\"role\":\"OFFICER\"}"
                        .formatted(username))).andExpect(status().isCreated());
        String bad = "{\"username\":\"%s\",\"password\":\"wrong-password\"}".formatted(username);
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\",\"password\":\"Officer@123\"}".formatted(username)))
                .andExpect(status().isLocked());
    }

    @Test
    void refreshTokenRotates() throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"Admin@12345\"}"))
                .andExpect(status().isOk()).andReturn();
        String refresh = JsonPath.read(res.getResponse().getContentAsString(), "$.refreshToken");
        String body = "{\"refreshToken\":\"" + refresh + "\"}";
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }
}
