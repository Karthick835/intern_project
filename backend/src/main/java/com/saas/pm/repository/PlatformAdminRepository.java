package com.saas.pm.repository;

import com.saas.pm.model.PlatformAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PlatformAdminRepository extends JpaRepository<PlatformAdmin, String> {
    Optional<PlatformAdmin> findByEmail(String email);
}
