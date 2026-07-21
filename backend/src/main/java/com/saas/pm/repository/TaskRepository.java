package com.saas.pm.repository;

import com.saas.pm.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByProjectId(String projectId);
    List<Task> findBySprintId(String sprintId);
    List<Task> findByAssigneeId(String assigneeId);
    List<Task> findByStatus(String status);
    List<Task> findBySprintIdAndStatus(String sprintId, String status);
    List<Task> findBySprintIsNull(); // Backlog tasks
}
