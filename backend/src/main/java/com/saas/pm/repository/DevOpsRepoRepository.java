package com.saas.pm.repository;

import com.saas.pm.model.DevOpsRepo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DevOpsRepoRepository extends JpaRepository<DevOpsRepo, String> {
    List<DevOpsRepo> findByTenantId(String tenantId);
}
