package com.dms.service;

import com.dms.entity.*;
import com.dms.repository.NotificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final NotificationLogRepository notificationLogRepository;

    @Value("${app.mail.from:noreply@dms.local}")
    private String from;

    @Async
    public void sendTaskAssigned(LegalAct act, List<String> recipientEmails) {
        String type = NotificationLog.TYPE_TASK_ASSIGNED;
        String notifType = "App\\Models\\LegalAct";

        if (notificationLogRepository.existsByNotifiableTypeAndNotifiableIdAndType(notifType, act.getId(), type)) {
            return;
        }

        String subject = "Yeni tapşırıq: " + act.getLegalActNumber();
        String body = "Sizə yeni tapşırıq təyin edilib.\n" +
                      "Tapşırıq: " + act.getLegalActNumber() + "\n" +
                      "İcra müddəti: " + act.getExecutionDeadline();

        sendToAll(recipientEmails, subject, body);

        notificationLogRepository.save(NotificationLog.builder()
                .notifiableType(notifType)
                .notifiableId(act.getId())
                .type(type)
                .sentAt(LocalDateTime.now())
                .build());
    }

    @Async
    public void sendDeadlineReminder(LegalAct act, List<String> recipientEmails) {
        String subject = "Tapşırığın müddəti yaxınlaşır: " + act.getLegalActNumber();
        String body = "Tapşırığın icra müddəti yaxınlaşır.\n" +
                      "Son tarix: " + act.getExecutionDeadline();
        sendToAll(recipientEmails, subject, body);
    }

    @Async
    public void sendDeadlineExpired(LegalAct act, List<String> recipientEmails) {
        String subject = "Tapşırığın müddəti bitib: " + act.getLegalActNumber();
        String body = "Tapşırığın icra müddəti keçib.\n" +
                      "Son tarix: " + act.getExecutionDeadline();
        sendToAll(recipientEmails, subject, body);
    }

    private void sendToAll(List<String> emails, String subject, String body) {
        for (String email : emails) {
            if (email == null || email.isBlank()) continue;
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(from);
                msg.setTo(email);
                msg.setSubject(subject);
                msg.setText(body);
                mailSender.send(msg);
            } catch (Exception e) {
                log.warn("Failed to send email to {}: {}", email, e.getMessage());
            }
        }
    }
}
