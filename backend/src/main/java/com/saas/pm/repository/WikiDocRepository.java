package com.saas.pm.repository;

import com.saas.pm.model.WikiDoc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WikiDocRepository extends JpaRepository<WikiDoc, String> {
    List<WikiDoc> findByTenantId(String tenantId);
}
