package com.saas.pm.repository;

import com.saas.pm.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {
    Optional<Tenant> findBySubdomain(String subdomain);
    Optional<Tenant> findByOwnerEmail(String ownerEmail);
}
