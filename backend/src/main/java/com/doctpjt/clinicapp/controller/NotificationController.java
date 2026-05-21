package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.Notification;
import com.doctpjt.clinicapp.service.NotificationService;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public Page<Notification> getAllNotifications(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return notificationService.getAllNotifications(userId, page, size);
    }

    @GetMapping("/unread")
    public Map<String, Long> getUnreadCount(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        long count = notificationService.getUnreadCount(userId);
        return Map.of("count", count);
    }

    @PutMapping("/{id}/read")
    public Notification markAsRead(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return notificationService.markAsRead(id, userId);
    }

    @PutMapping("/read-all")
    public Map<String, Integer> markAllAsRead(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        int updated = notificationService.markAllAsRead(userId);
        return Map.of("updated", updated);
    }
}
