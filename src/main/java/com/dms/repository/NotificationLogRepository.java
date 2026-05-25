package com.dms.repository;

import com.dms.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {

    boolean existsByNotifiableTypeAndNotifiableIdAndType(String notifiableType, Long notifiableId, String type);

    Optional<NotificationLog> findByNotifiableTypeAndNotifiableIdAndType(
            String notifiableType, Long notifiableId, String type);
}
