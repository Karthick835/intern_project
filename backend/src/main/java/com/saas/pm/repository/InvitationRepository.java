package com.saas.pm.repository;

import com.saas.pm.model.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, String> {
    Optional<Invitation> findByToken(String token);
    Optional<Invitation> findByEmailAndTenantId(String email, String tenantId);
    List<Invitation> findByTenantId(String tenantId);
}
