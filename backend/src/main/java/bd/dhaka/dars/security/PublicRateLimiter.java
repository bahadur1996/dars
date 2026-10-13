package bd.dhaka.dars.security;

import bd.dhaka.dars.exception.ApiException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Fixed one-hour window per (bucket, client) for the unauthenticated endpoints. In memory, so limits are
 * per instance and reset on restart; good enough to blunt form spam on a single node.
 */
@Component
public class PublicRateLimiter {

    static final Duration WINDOW = Duration.ofHours(1);
    private static final int SWEEP_THRESHOLD = 10_000;

    private record Window(Instant start, AtomicInteger count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Counts one request and throws 429 {@code RATE_LIMITED} once {@code limit} is exceeded. */
    public void check(String bucket, String client, int limit) {
        Instant now = Instant.now();
        if (windows.size() > SWEEP_THRESHOLD) {
            windows.values().removeIf(w -> expired(w, now));
        }
        Window w = windows.compute(bucket + ":" + client,
                (k, old) -> old == null || expired(old, now) ? new Window(now, new AtomicInteger()) : old);
        if (w.count().incrementAndGet() > limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Too many requests. Please try again later.");
        }
    }

    private static boolean expired(Window w, Instant now) {
        return !w.start().plus(WINDOW).isAfter(now);
    }
}
