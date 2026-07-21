package com.saas.pm.repository;

import com.saas.pm.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByStatus(String status);
    List<Project> findByStatusNot(String status);
}
