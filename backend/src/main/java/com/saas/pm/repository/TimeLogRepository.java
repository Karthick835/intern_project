package com.saas.pm.repository;

import com.saas.pm.model.TimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, String> {
    List<TimeLog> findByTaskId(String taskId);
    List<TimeLog> findByUserId(String userId);
}
