package bd.dhaka.dars;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

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
        return createOwner(token, uniqueNid());
    }

    Integer createOwner(String token, String nid) throws Exception {
        String body = """
                {"fullName":"Owner Mia","nid":"%s","mobile":"01812345678",
                 "address":{"division":"Dhaka","district":"Dhaka","thana":"Mirpur","line":"Road 5"}}
                """.formatted(nid);
        MvcResult res = mvc.perform(json(post("/api/v1/owners"), token, body))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }

    String rickshawJson(String number, Integer ownerId, String photoId) {
        String num = number == null ? "null" : "\"" + number + "\"";
        return """
                {"rickshawNumber":%s,"thana":"Mirpur","color":"Green","photoId":"%s","ownerId":%d}
                """.formatted(num, photoId, ownerId);
    }

    /** Registers a rickshaw with an auto-issued number and returns {id, number}. */
    Object[] createRickshaw(String token, Integer ownerId) throws Exception {
        MvcResult res = mvc.perform(json(post("/api/v1/rickshaws"), token,
                        rickshawJson(null, ownerId, uploadPhoto(token))))
                .andExpect(status().isCreated()).andReturn();
        String body = res.getResponse().getContentAsString();
        return new Object[]{JsonPath.read(body, "$.id"), JsonPath.read(body, "$.rickshawNumber")};
    }

    String driverCodeOf(String token, Integer driverId) throws Exception {
        MvcResult res = mvc.perform(auth(get("/api/v1/drivers/{id}", driverId), token)).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.driverCode");
    }

    /** Each test uses its own client IP so the public rate limits don't leak between tests. */
    static RequestPostProcessor fromIp(String ip) {
        return req -> {
            req.setRemoteAddr(ip);
            return req;
        };
    }

    static String uniqueIp() {
        int n = SEQ.incrementAndGet();
        return "10.%d.%d.%d".formatted((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }

    String complaintJson(String rickshawNumber, String driverCode) {
        return """
                {"rickshawNumber":"%s","driverCode":"%s","complainantName":"Rina Akter",
                 "complainantPhone":"01912345678","complainantNid":"1234567890","category":"OVERCHARGING",
                 "description":"Charged double the fare","thana":"Mirpur"}
                """.formatted(rickshawNumber, driverCode);
    }

    /** Files a public complaint (no token) and returns its complaint number. */
    String fileComplaint(String rickshawNumber, String driverCode) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/public/complaints").with(fromIp(uniqueIp()))
                        .contentType(MediaType.APPLICATION_JSON).content(complaintJson(rickshawNumber, driverCode)))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.complaintNo");
    }

    Integer complaintId(String token, String complaintNo, String rickshawNumber) throws Exception {
        MvcResult res = mvc.perform(auth(get("/api/v1/complaints").param("rickshawNumber", rickshawNumber), token))
                .andReturn();
        List<Integer> ids = JsonPath.read(res.getResponse().getContentAsString(),
                "$.content[?(@.complaintNo=='" + complaintNo + "')].id");
        return ids.getFirst();
    }

    // ---------- tests ----------

    @Test
    void protectedEndpointsRequireToken() throws Exception {
        mvc.perform(get("/api/v1/drivers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/rickshaws")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/complaints")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/cases")).andExpect(status().isUnauthorized());
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
        mvc.perform(auth(get("/api/v1/drivers/{id}", driverId), officer))
                .andExpect(jsonPath("$.currentRickshaw").doesNotExist());

        // Rickshaw with auto-issued number, registered without a driver
        String ownerNid = uniqueNid();
        Integer ownerId = createOwner(officer, ownerNid);
        MvcResult res = mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(null, ownerId, uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rickshawNumber", startsWith("DHK-AR-")))
                .andExpect(jsonPath("$.owner.id").value(ownerId))
                .andExpect(jsonPath("$.currentDriver").doesNotExist())
                .andExpect(jsonPath("$.registeredBy.username", startsWith("officer")))
                .andReturn();
        Integer rickshawId = JsonPath.read(res.getResponse().getContentAsString(), "$.id");
        String number = JsonPath.read(res.getResponse().getContentAsString(), "$.rickshawNumber");

        // Owner is required
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        "{\"thana\":\"Mirpur\",\"photoId\":\"" + uploadPhoto(officer) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OWNER_REQUIRED"));

        // Manual number, duplicate number
        String manual = "MIR-" + SEQ.incrementAndGet() + "X";
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(manual.toLowerCase(), ownerId, uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rickshawNumber").value(manual));
        mvc.perform(json(post("/api/v1/rickshaws"), officer,
                        rickshawJson(manual, ownerId, uploadPhoto(officer))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NUMBER"));

        // Search by number and by the owner's NID
        mvc.perform(auth(get("/api/v1/rickshaws").param("q", number), officer))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/v1/rickshaws").param("q", ownerNid), officer))
                .andExpect(jsonPath("$.totalElements").value(2));

        // Card PDF and public verify (no token)
        MvcResult pdf = mvc.perform(auth(get("/api/v1/rickshaws/{id}/card.pdf", rickshawId), officer))
                .andExpect(status().isOk()).andReturn();
        assertThat(new String(pdf.getResponse().getContentAsByteArray(), 0, 4)).isEqualTo("%PDF");
        // FR-17: the vehicle QR code opens the web scan page for this number; officers only
        MvcResult qr = mvc.perform(auth(get("/api/v1/rickshaws/{id}/qr.png", rickshawId), officer))
                .andExpect(status().isOk()).andReturn();
        assertThat(qr.getResponse().getContentType()).isEqualTo(MediaType.IMAGE_PNG_VALUE);
        assertThat(decodeQr(qr.getResponse().getContentAsByteArray())).endsWith("/r/" + number);
        mvc.perform(get("/api/v1/rickshaws/{id}/qr.png", rickshawId)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/public/verify/{n}", number))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.owner").doesNotExist());

        // Dashboard + audit
        mvc.perform(auth(get("/api/v1/dashboard/summary"), officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perDay", hasSize(30)))
                .andExpect(jsonPath("$.openComplaints").isNumber())
                .andExpect(jsonPath("$.openCases").isNumber());
        mvc.perform(auth(get("/api/v1/audit").param("entity", "rickshaw"), adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].actor.username", startsWith("officer")));
    }

    @Test
    void ownershipTransferKeepsHistory() throws Exception {
        String officer = createOfficer();
        Integer owner1 = createOwner(officer);
        Integer owner2 = createOwner(officer);
        Integer rickshawId = (Integer) createRickshaw(officer, owner1)[0];

        mvc.perform(json(post("/api/v1/rickshaws/{id}/ownership", rickshawId), officer,
                        "{\"ownerId\":" + owner1 + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SAME_OWNER"));

        // Any officer may transfer, not only the one who registered the rickshaw
        String otherOfficer = createOfficer();
        mvc.perform(json(post("/api/v1/rickshaws/{id}/ownership", rickshawId), otherOfficer,
                        "{\"ownerId\":" + owner2 + ",\"note\":\"Sold\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.owner.id").value(owner2))
                .andExpect(jsonPath("$.note").value("Sold"));
        mvc.perform(auth(get("/api/v1/rickshaws/{id}", rickshawId), officer))
                .andExpect(jsonPath("$.owner.id").value(owner2));
        mvc.perform(auth(get("/api/v1/rickshaws/{id}/ownership", rickshawId), officer))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].owner.id").value(owner2))
                .andExpect(jsonPath("$[0].toDate").doesNotExist())
                .andExpect(jsonPath("$[1].owner.id").value(owner1))
                .andExpect(jsonPath("$[1].toDate").isNotEmpty());

        // Editing the rickshaw does not change its owner
        mvc.perform(json(put("/api/v1/rickshaws/{id}", rickshawId), officer,
                        rickshawJson(null, owner1, uploadPhoto(officer))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.id").value(owner2));
    }

    @Test
    void publicComplaintFlow() throws Exception {
        String officer = createOfficer();
        Integer driverId = createDriver(officer, uniqueNid());
        String driverCode = driverCodeOf(officer, driverId);
        Object[] rickshaw = createRickshaw(officer, createOwner(officer));
        String number = (String) rickshaw[1];

        // Filed without a token; the response carries no personal data
        String ip = uniqueIp();
        MvcResult res = mvc.perform(post("/api/v1/public/complaints").with(fromIp(ip))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(complaintJson(number.toLowerCase(), driverCode.toLowerCase())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.complaintNo", startsWith("CMP-")))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.complainantNid").doesNotExist())
                .andExpect(jsonPath("$.complainantPhone").doesNotExist())
                .andReturn();
        String complaintNo = JsonPath.read(res.getResponse().getContentAsString(), "$.complaintNo");

        // Status lookup needs the matching phone
        mvc.perform(get("/api/v1/public/complaints/{no}", complaintNo).param("phone", "01912345678")
                        .with(fromIp(ip)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));
        mvc.perform(get("/api/v1/public/complaints/{no}", complaintNo).param("phone", "01700000000")
                        .with(fromIp(ip)))
                .andExpect(status().isNotFound());

        // Unknown rickshaw / driver, missing fields, honeypot
        mvc.perform(post("/api/v1/public/complaints").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                        .content(complaintJson("NOPE-404", driverCode)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RICKSHAW_NOT_FOUND"));
        mvc.perform(post("/api/v1/public/complaints").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                        .content(complaintJson(number, "DRV-0000-000000")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DRIVER_NOT_FOUND"));
        mvc.perform(post("/api/v1/public/complaints").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rickshawNumber\":\"" + number + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='complainantNid')]").exists());
        mvc.perform(post("/api/v1/public/complaints").with(fromIp(uniqueIp()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(complaintJson(number, driverCode).replace("}", ",\"website\":\"spam\"}")))
                .andExpect(status().isBadRequest());

        // Staff see the full complaint
        Integer id = complaintId(officer, complaintNo, number);
        mvc.perform(auth(get("/api/v1/complaints/{id}", id), officer))
                .andExpect(jsonPath("$.complainantNid").value("1234567890"))
                .andExpect(jsonPath("$.rickshaw.rickshawNumber").value(number))
                .andExpect(jsonPath("$.driver.driverCode").value(driverCode));
        mvc.perform(auth(get("/api/v1/complaints").param("complainant", "01912345678")
                        .param("driverCode", driverCode), officer))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/v1/rickshaws/{id}/complaints", rickshaw[0]), officer))
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(auth(get("/api/v1/drivers/{id}/complaints", driverId), officer))
                .andExpect(jsonPath("$", hasSize(1)));

        // Officer decisions
        mvc.perform(json(patch("/api/v1/complaints/{id}/status", id), officer,
                        "{\"status\":\"ESCALATED\",\"note\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
        mvc.perform(json(patch("/api/v1/complaints/{id}/status", id), officer, "{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(json(patch("/api/v1/complaints/{id}/status", id), officer,
                        "{\"status\":\"RESOLVED\",\"note\":\"Fare refunded\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.handledBy.username", startsWith("officer")));
        mvc.perform(json(patch("/api/v1/complaints/{id}/status", id), officer,
                        "{\"status\":\"REJECTED\",\"note\":\"x\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMPLAINT_NOT_OPEN"));
        mvc.perform(get("/api/v1/public/complaints/{no}", complaintNo).param("phone", "01912345678")
                        .with(fromIp(ip)))
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNote").value("Fare refunded"));
    }

    @Test
    void publicLookupIsRateLimited() throws Exception {
        String ip = uniqueIp();
        for (int i = 0; i < 30; i++) {
            mvc.perform(get("/api/v1/public/complaints/CMP-0000-000000").param("phone", "01712345678")
                            .with(fromIp(ip)))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/public/complaints/CMP-0000-000000").param("phone", "01712345678")
                        .with(fromIp(ip)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void caseFlow() throws Exception {
        String officer = createOfficer();
        Integer driverId = createDriver(officer, uniqueNid());
        Object[] rickshaw = createRickshaw(officer, createOwner(officer));
        String caseBody = """
                {%s"offence":"Overcharging","description":"Repeated complaints","incidentAt":"2026-01-10T08:00:00Z",
                 "thana":"Mirpur","evidencePhotoIds":["%s"]}
                """;

        mvc.perform(json(post("/api/v1/cases"), officer, caseBody.formatted("", uploadPhoto(officer))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CASE_TARGET_REQUIRED"));

        // A case against a driver only
        mvc.perform(json(post("/api/v1/cases"), officer,
                        caseBody.formatted("\"driverId\":" + driverId + ",", uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caseNo", startsWith("CASE-")))
                .andExpect(jsonPath("$.rickshaw").doesNotExist())
                .andExpect(jsonPath("$.evidencePhotoIds", hasSize(1)));

        // Escalating a complaint takes its rickshaw and driver
        String complaintNo = fileComplaint((String) rickshaw[1], driverCodeOf(officer, driverId));
        Integer complaintId = complaintId(officer, complaintNo, (String) rickshaw[1]);
        MvcResult res = mvc.perform(json(post("/api/v1/cases"), officer,
                        caseBody.formatted("\"complaintId\":" + complaintId + ",", uploadPhoto(officer))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rickshaw.id").value(rickshaw[0]))
                .andExpect(jsonPath("$.driver.id").value(driverId))
                .andExpect(jsonPath("$.complaint.complaintNo").value(complaintNo))
                .andReturn();
        Integer caseId = JsonPath.read(res.getResponse().getContentAsString(), "$.id");
        String caseNo = JsonPath.read(res.getResponse().getContentAsString(), "$.caseNo");
        mvc.perform(auth(get("/api/v1/complaints/{id}", complaintId), officer))
                .andExpect(jsonPath("$.status").value("ESCALATED"))
                .andExpect(jsonPath("$.caseFile.caseNo").value(caseNo));
        mvc.perform(json(post("/api/v1/cases"), officer,
                        caseBody.formatted("\"complaintId\":" + complaintId + ",", uploadPhoto(officer))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMPLAINT_NOT_OPEN"));
        mvc.perform(auth(get("/api/v1/drivers/{id}/cases", driverId), officer))
                .andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(auth(get("/api/v1/cases").param("rickshawNumber", (String) rickshaw[1]), officer))
                .andExpect(jsonPath("$.totalElements").value(1));

        // Status flow
        String to = "{\"status\":\"%s\",\"note\":\"n\"}";
        mvc.perform(json(patch("/api/v1/cases/{id}/status", caseId), officer, to.formatted("OPEN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
        mvc.perform(json(patch("/api/v1/cases/{id}/status", caseId), officer, to.formatted("UNDER_INVESTIGATION")))
                .andExpect(status().isOk());
        mvc.perform(json(patch("/api/v1/cases/{id}/status", caseId), officer, to.formatted("CLOSED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closedAt").isNotEmpty());
        mvc.perform(json(patch("/api/v1/cases/{id}/status", caseId), officer, to.formatted("OPEN")))
                .andExpect(status().isForbidden());
        mvc.perform(json(patch("/api/v1/cases/{id}/status", caseId), adminToken, to.formatted("OPEN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closedAt").doesNotExist());
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

    private static String decodeQr(byte[] png) throws IOException, NotFoundException {
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(png));
        return new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(
                new BufferedImageLuminanceSource(img)))).getText();
    }
}
