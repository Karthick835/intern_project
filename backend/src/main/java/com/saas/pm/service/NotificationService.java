package com.saas.pm.service;

import com.saas.pm.model.Notification;
import com.saas.pm.model.User;
import com.saas.pm.repository.NotificationRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository,
                              UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public Notification createNotification(String userId, String content) {
        log.info("Creating notification for user: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        Notification notification = Notification.builder()
                .id(UUID.randomUUID().toString())
                .user(userOpt.get())
                .content(content)
                .isRead(false)
                .build();
        
        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(String userId) {
        log.info("Fetching notifications for user: {}", userId);
        return notificationRepository.findByUserId(userId);
    }

    public List<Notification> getUnreadNotifications(String userId) {
        log.info("Fetching unread notifications for user: {}", userId);
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    public Notification markAsRead(String notificationId) {
        log.info("Marking notification as read: {}", notificationId);
        
        Optional<Notification> notifOpt = notificationRepository.findById(notificationId);
        if (notifOpt.isEmpty()) {
            throw new RuntimeException("Notification not found");
        }
        
        Notification notification = notifOpt.get();
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void deleteNotification(String notificationId) {
        log.info("Deleting notification: {}", notificationId);
        notificationRepository.deleteById(notificationId);
    }
}
