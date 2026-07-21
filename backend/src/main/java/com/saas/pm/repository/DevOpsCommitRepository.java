package com.saas.pm.repository;

import com.saas.pm.model.DevOpsCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DevOpsCommitRepository extends JpaRepository<DevOpsCommit, String> {
    List<DevOpsCommit> findByTenantId(String tenantId);
    List<DevOpsCommit> findByTaskId(String taskId);
}
