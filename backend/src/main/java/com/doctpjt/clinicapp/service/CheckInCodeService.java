package com.doctpjt.clinicapp.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Stores check-in code → appointmentId mapping.
 * Uses Redis if available, falls back to in-memory ConcurrentHashMap.
 */
@Service
public class CheckInCodeService {

    private static final String KEY_PREFIX = "checkin:";
    private static final long TTL_HOURS = 48; // codes expire after 48 hours

    private final RedisTemplate<String, Object> redisTemplate;
    private final ConcurrentHashMap<String, Long> fallbackMap = new ConcurrentHashMap<>();
    private boolean redisAvailable = true;

    public CheckInCodeService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
        } catch (Exception e) {
            this.redisAvailable = false;
        }
    }

    public void storeCode(String code, Long appointmentId) {
        if (redisAvailable) {
            try {
                redisTemplate.opsForValue().set(KEY_PREFIX + code.toUpperCase(), appointmentId, TTL_HOURS, TimeUnit.HOURS);
                return;
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        fallbackMap.put(code.toUpperCase(), appointmentId);
    }

    public Long getAppointmentId(String code) {
        if (redisAvailable) {
            try {
                Object val = redisTemplate.opsForValue().get(KEY_PREFIX + code.toUpperCase());
                if (val instanceof Number) return ((Number) val).longValue();
                if (val instanceof String) return Long.parseLong((String) val);
                return null;
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        return fallbackMap.get(code.toUpperCase());
    }

    public void removeCode(String code) {
        if (redisAvailable) {
            try {
                redisTemplate.delete(KEY_PREFIX + code.toUpperCase());
                return;
            } catch (Exception e) {
                redisAvailable = false;
            }
        }
        fallbackMap.remove(code.toUpperCase());
    }
}
