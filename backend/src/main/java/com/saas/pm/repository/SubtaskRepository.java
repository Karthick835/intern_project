package com.saas.pm.repository;

import com.saas.pm.model.Subtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubtaskRepository extends JpaRepository<Subtask, String> {
    List<Subtask> findByTaskId(String taskId);
}
