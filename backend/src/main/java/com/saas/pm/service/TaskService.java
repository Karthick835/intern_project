package com.saas.pm.service;

import com.saas.pm.model.Task;
import com.saas.pm.model.User;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.saas.pm.config.TenantContext;
import com.saas.pm.config.PlanLimits;
import com.saas.pm.model.Tenant;
import com.saas.pm.repository.TenantRepository;
import com.saas.pm.exception.PlanLimitExceededException;
import com.saas.pm.model.Project;
import com.saas.pm.repository.ProjectRepository;

@Service
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public Task createTask(String title, String description, String priority, String type,
                          String status, String projectId) {
        log.info("Creating task: {}", title);

        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null && !tenantId.equalsIgnoreCase("public") && !tenantId.equalsIgnoreCase("default")) {
            Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
            if (tenant != null) {
                PlanLimits.LimitDetails limits = PlanLimits.getLimits(tenant.getPlan());
                long taskCount = taskRepository.findByProjectId(projectId).size();
                if (taskCount >= limits.maxTasksPerProject) {
                    throw new PlanLimitExceededException("Your plan (" + tenant.getPlan() + ") limit of " + limits.maxTasksPerProject + " tasks per project has been reached. Please upgrade your plan to create more tasks.");
                }
            }
        }
        
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        Task task = Task.builder()
                .id(UUID.randomUUID().toString())
                .title(title)
                .description(description)
                .priority(priority)
                .type(type)
                .status(status)
                .project(project)
                .build();
        
        return taskRepository.save(task);
    }

    public Task assignTask(String taskId, String assigneeId) {
        log.info("Assigning task {} to user {}", taskId, assigneeId);
        
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        Optional<User> userOpt = userRepository.findById(assigneeId);
        
        if (taskOpt.isEmpty() || userOpt.isEmpty()) {
            throw new RuntimeException("Task or User not found");
        }
        
        Task task = taskOpt.get();
        task.setAssignee(userOpt.get());
        return taskRepository.save(task);
    }

    public void validateTaskStatus(Task task, String newStatus) {
        if ("DONE".equalsIgnoreCase(newStatus) && task.getBlockedBy() != null) {
            if (!"DONE".equalsIgnoreCase(task.getBlockedBy().getStatus())) {
                throw new com.saas.pm.exception.TaskBlockedException(
                    "Cannot complete task: Blocked by task '" + task.getBlockedBy().getTitle() + "' which is still incomplete."
                );
            }
        }
    }

    public Task updateTaskStatus(String taskId, String newStatus) {
        log.info("Updating task {} status to {}", taskId, newStatus);
        
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        if (taskOpt.isEmpty()) {
            throw new RuntimeException("Task not found");
        }
        
        Task task = taskOpt.get();
        validateTaskStatus(task, newStatus);
        task.setStatus(newStatus);
        return taskRepository.save(task);
    }

    public Optional<Task> getTask(String taskId) {
        log.info("Fetching task: {}", taskId);
        return taskRepository.findById(taskId);
    }

    public List<Task> getTasksByProject(String projectId) {
        log.info("Fetching tasks for project: {}", projectId);
        return taskRepository.findByProjectId(projectId);
    }

    public List<Task> getTasksByAssignee(String assigneeId) {
        log.info("Fetching tasks assigned to user: {}", assigneeId);
        return taskRepository.findByAssigneeId(assigneeId);
    }

    public List<Task> getTasksByStatus(String status) {
        log.info("Fetching tasks with status: {}", status);
        return taskRepository.findByStatus(status);
    }

    public List<Task> getTasksBySprint(String sprintId) {
        log.info("Fetching tasks for sprint: {}", sprintId);
        return taskRepository.findBySprintId(sprintId);
    }

    public void deleteTask(String taskId) {
        log.info("Deleting task: {}", taskId);
        taskRepository.deleteById(taskId);
    }
}
