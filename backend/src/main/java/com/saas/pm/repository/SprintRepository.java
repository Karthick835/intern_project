package com.saas.pm.repository;

import com.saas.pm.model.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, String> {
    List<Sprint> findByStatus(String status);
    Optional<Sprint> findFirstByStatus(String status);
}
