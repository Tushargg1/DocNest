package com.doctpjt.clinicapp.audit;

import com.doctpjt.clinicapp.entity.AccessStatus;
import com.doctpjt.clinicapp.entity.AuditLog;
import com.doctpjt.clinicapp.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class LoggingAspect {

    private final AuditLogRepository auditLogRepository;

    public LoggingAspect(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Around("@annotation(auditAccess)")
    public Object aroundAuditedMethod(ProceedingJoinPoint joinPoint, AuditAccess auditAccess) throws Throwable {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!isDoctor(authentication)) {
            return joinPoint.proceed();
        }

        Long actorId = toLong(authentication.getPrincipal());
        Long subjectId = resolveSubjectId(joinPoint, auditAccess.subjectIdParam());
        String endpoint = resolveEndpoint();

        try {
            Object result = joinPoint.proceed();
            persistAudit(actorId, subjectId, auditAccess.action(), endpoint, AccessStatus.SUCCESS);
            return result;
        } catch (Throwable ex) {
            persistAudit(actorId, subjectId, auditAccess.action(), endpoint, AccessStatus.DENIED);
            throw ex;
        }
    }

    private void persistAudit(Long actorId, Long subjectId, String action, String endpoint, AccessStatus accessStatus) {
        try {
            LocalDateTime timestamp = LocalDateTime.now();
            String previousHash = auditLogRepository.findTopByRowHashIsNotNullOrderByIdDesc()
                .map(AuditLog::getRowHash)
                .orElse("GENESIS");

            AuditLog auditLog = new AuditLog();
            auditLog.setTimestamp(timestamp);
            auditLog.setActorId(actorId);
            auditLog.setSubjectId(subjectId);
            auditLog.setAction(action);
            auditLog.setEndpoint(endpoint);
            auditLog.setPreviousHash(previousHash);
            auditLog.setAccessStatus(accessStatus);
            auditLog.setRowHash(buildRowHash(previousHash, timestamp, actorId, subjectId, action, endpoint, accessStatus));
            auditLogRepository.save(auditLog);
        } catch (Exception ignored) {
            // Audit failure must never block clinical workflows.
        }
    }

    private String buildRowHash(
        String previousHash,
        LocalDateTime timestamp,
        Long actorId,
        Long subjectId,
        String action,
        String endpoint,
        AccessStatus accessStatus
    ) {
        String data = previousHash + "|"
            + timestamp + "|"
            + actorId + "|"
            + subjectId + "|"
            + action + "|"
            + endpoint + "|"
            + accessStatus;
        return sha256Hex(data);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private Long resolveSubjectId(ProceedingJoinPoint joinPoint, String subjectIdParam) {
        MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
        String[] parameterNames = methodSignature.getParameterNames();
        if (parameterNames == null) {
            return null;
        }

        Object[] args = joinPoint.getArgs();
        for (int i = 0; i < parameterNames.length; i++) {
            if (subjectIdParam.equals(parameterNames[i])) {
                return toLong(args[i]);
            }
        }
        return null;
    }

    private String resolveEndpoint() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (!(requestAttributes instanceof ServletRequestAttributes servletRequestAttributes)) {
            return "UNKNOWN_ENDPOINT";
        }
        HttpServletRequest request = servletRequestAttributes.getRequest();
        return request.getMethod() + " " + request.getRequestURI();
    }

    private boolean isDoctor(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_DOCTOR"::equals);
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Long longValue) {
            return longValue;
        }
        if (value instanceof Integer intValue) {
            return intValue.longValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Long.parseLong(stringValue);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
