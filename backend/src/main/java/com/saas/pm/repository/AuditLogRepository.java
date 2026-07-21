package com.saas.pm.repository;

import com.saas.pm.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findByEntityAndEntityIdOrderByTimestampDesc(String entity, String entityId);
    List<AuditLog> findAllByOrderByTimestampDesc();
}
