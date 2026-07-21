package com.saas.pm.repository;

import com.saas.pm.model.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface JoinRequestRepository extends JpaRepository<JoinRequest, String> {
    Optional<JoinRequest> findByEmailAndTenantId(String email, String tenantId);
    List<JoinRequest> findByTenantIdAndStatus(String tenantId, String status);
    List<JoinRequest> findByTenantId(String tenantId);
}
