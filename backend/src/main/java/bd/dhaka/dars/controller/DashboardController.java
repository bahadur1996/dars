package bd.dhaka.dars.controller;

import bd.dhaka.dars.entity.RickshawStatus;
import bd.dhaka.dars.repository.DriverRepository;
import bd.dhaka.dars.repository.RickshawRepository;
import bd.dhaka.dars.service.RickshawService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-11 dashboard summary. */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    static final int DAYS = 30;
    static final int TOP = 10;

    private final RickshawRepository rickshaws;
    private final DriverRepository drivers;

    public DashboardController(RickshawRepository rickshaws, DriverRepository drivers) {
        this.rickshaws = rickshaws;
        this.drivers = drivers;
    }

    public record Count(String label, long count) {
    }

    public record Summary(long totalRickshaws, long activeRickshaws, long totalDrivers, long registeredToday,
                          List<Count> perDay, List<Count> perThana, List<Count> topOfficers) {
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public Summary summary() {
        LocalDate today = LocalDate.now(RickshawService.DHAKA);
        LocalDate start = today.minusDays(DAYS - 1);
        Map<LocalDate, Long> byDay = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            byDay.put(d, 0L);
        }
        Instant since = start.atStartOfDay(RickshawService.DHAKA).toInstant();
        for (Instant at : rickshaws.registeredSince(since)) {
            byDay.merge(LocalDate.ofInstant(at, RickshawService.DHAKA), 1L, Long::sum);
        }
        List<Count> perDay = byDay.entrySet().stream().map(e -> new Count(e.getKey().toString(), e.getValue())).toList();

        return new Summary(
                rickshaws.count(),
                rickshaws.countByStatus(RickshawStatus.ACTIVE),
                drivers.count(),
                byDay.getOrDefault(today, 0L),
                perDay,
                toCounts(rickshaws.countByThana()),
                toCounts(rickshaws.countByOfficer()));
    }

    private static List<Count> toCounts(List<Object[]> rows) {
        return rows.stream().limit(TOP).map(r -> new Count((String) r[0], ((Number) r[1]).longValue())).toList();
    }
}
