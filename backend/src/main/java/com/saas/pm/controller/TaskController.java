package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.dto.CommentRequest;
import com.saas.pm.dto.TaskRequest;
import com.saas.pm.dto.TimeLogRequest;
import com.saas.pm.model.*;
import com.saas.pm.repository.*;
import com.saas.pm.service.TaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin
@Slf4j
public class TaskController {

    private final TaskService taskService;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final SubtaskRepository subtaskRepository;
    private final CommentRepository commentRepository;
    private final TimeLogRepository timeLogRepository;
    private final AuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    public TaskController(TaskService taskService,
                          TaskRepository taskRepository,
                          ProjectRepository projectRepository,
                          SprintRepository sprintRepository,
                          UserRepository userRepository,
                          SubtaskRepository subtaskRepository,
                          CommentRepository commentRepository,
                          TimeLogRepository timeLogRepository,
                          AuditLogRepository auditLogRepository) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.subtaskRepository = subtaskRepository;
        this.commentRepository = commentRepository;
        this.timeLogRepository = timeLogRepository;
        this.auditLogRepository = auditLogRepository;
    }

    private void writeAuditLog(String action, String entityId, String taskTitle) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            AuditLog audit = AuditLog.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .action(action)
                    .entity("TASK")
                    .entityId(entityId)
                    .build();
            auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write task audit log", e);
        }
    }

    private void broadcastActivity(String content, String actorName) {
        if (messagingTemplate == null) return;
        try {
            String tenantId = TenantContext.getCurrentTenant();
            Map<String, Object> activity = new HashMap<>();
            activity.put("sender", actorName != null ? actorName : "System");
            activity.put("content", content);
            activity.put("type", "ACTIVITY");
            activity.put("timestamp", LocalDateTime.now().toString());
            messagingTemplate.convertAndSend("/topic/messages/" + tenantId, activity);
        } catch (Exception e) {
            log.warn("Failed to broadcast activity: {}", e.getMessage());
        }
    }

    private String getCurrentUserName() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            return userRepository.findByEmail(email).map(User::getName).orElse("Someone");
        } catch (Exception e) {
            return "Someone";
        }
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        log.info("Fetching all tasks");
        return ResponseEntity.ok(taskRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable String id) {
        log.info("Fetching task: {}", id);
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Task>> getTasksByProject(@PathVariable String projectId) {
        log.info("Fetching tasks for project: {}", projectId);
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<List<Task>> getTasksBySprint(@PathVariable String sprintId) {
        log.info("Fetching tasks for sprint: {}", sprintId);
        return ResponseEntity.ok(taskService.getTasksBySprint(sprintId));
    }

    @GetMapping("/assignee/{assigneeId}")
    public ResponseEntity<List<Task>> getTasksByAssignee(@PathVariable String assigneeId) {
        log.info("Fetching tasks assigned to: {}", assigneeId);
        return ResponseEntity.ok(taskService.getTasksByAssignee(assigneeId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Task>> getTasksByStatus(@PathVariable String status) {
        log.info("Fetching tasks with status: {}", status);
        return ResponseEntity.ok(taskService.getTasksByStatus(status));
    }

    @GetMapping("/backlog")
    public ResponseEntity<List<Task>> getBacklogTasks() {
        log.info("Fetching backlog tasks (sprint is null)");
        return ResponseEntity.ok(taskRepository.findBySprintIsNull());
    }

    @GetMapping("/project/all")
    public ResponseEntity<List<Task>> getProjectAllTasks() {
        log.info("Fetching all tasks (fallback)");
        return ResponseEntity.ok(taskRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody TaskRequest request) {
        log.info("Creating task: {}", request.getTitle());
        
        if (request.getProjectId() == null) {
            return ResponseEntity.badRequest().build();
        }

        // Call service to check limits and create the task (saves it with project)
        Task savedTask = taskService.createTask(
                request.getTitle(),
                request.getDescription(),
                request.getPriority() != null ? request.getPriority() : "MEDIUM",
                request.getType() != null ? request.getType() : "FEATURE",
                request.getStatus() != null ? request.getStatus() : "TO_DO",
                request.getProjectId()
        );

        boolean needsUpdate = false;
        if (request.getSprintId() != null) {
            final Task finalTask = savedTask;
            sprintRepository.findById(request.getSprintId()).ifPresent(finalTask::setSprint);
            needsUpdate = true;
        }

        if (request.getAssigneeId() != null) {
            final Task finalTask = savedTask;
            userRepository.findById(request.getAssigneeId()).ifPresent(finalTask::setAssignee);
            needsUpdate = true;
        }

        if (request.getDueDate() != null) {
            savedTask.setDueDate(request.getDueDate());
            needsUpdate = true;
        }

        if (request.getTimeEstimate() != null) {
            savedTask.setTimeEstimate(request.getTimeEstimate());
            needsUpdate = true;
        }

        if (request.getBlockedById() != null) {
            final Task finalTask = savedTask;
            if (request.getBlockedById().isEmpty() || "null".equals(request.getBlockedById())) {
                finalTask.setBlockedBy(null);
            } else {
                taskRepository.findById(request.getBlockedById()).ifPresent(finalTask::setBlockedBy);
            }
            needsUpdate = true;
        }

        if (needsUpdate) {
            savedTask = taskRepository.save(savedTask);
        }

        writeAuditLog("CREATE", savedTask.getId(), savedTask.getTitle());
        broadcastActivity("✅ " + getCurrentUserName() + " created task \"" + savedTask.getTitle() + "\"", getCurrentUserName());
        return ResponseEntity.ok(savedTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable String id, @RequestBody TaskRequest request) {
        log.info("Updating task: {}", id);
        
        Optional<Task> taskOpt = taskRepository.findById(id);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Task task = taskOpt.get();
        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getType() != null) task.setType(request.getType());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getTimeEstimate() != null) task.setTimeEstimate(request.getTimeEstimate());

        if (request.getAssigneeId() != null) {
            if (request.getAssigneeId().isEmpty() || "null".equals(request.getAssigneeId())) {
                task.setAssignee(null);
            } else {
                userRepository.findById(request.getAssigneeId()).ifPresent(task::setAssignee);
            }
        }

        if (request.getSprintId() != null) {
            if (request.getSprintId().isEmpty() || "null".equals(request.getSprintId())) {
                task.setSprint(null);
            } else {
                sprintRepository.findById(request.getSprintId()).ifPresent(task::setSprint);
            }
        }

        if (request.getBlockedById() != null) {
            if (request.getBlockedById().isEmpty() || "null".equals(request.getBlockedById())) {
                task.setBlockedBy(null);
            } else {
                if (!id.equals(request.getBlockedById())) {
                    taskRepository.findById(request.getBlockedById()).ifPresent(task::setBlockedBy);
                }
            }
        }

        if (request.getStatus() != null) {
            taskService.validateTaskStatus(task, request.getStatus());
            task.setStatus(request.getStatus());
        }

        Task updated = taskRepository.save(task);
        writeAuditLog("UPDATE", updated.getId(), updated.getTitle());
        
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/tasks/" + id, updated);
        }

        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/status/{status}")
    public ResponseEntity<Task> updateTaskStatus(@PathVariable String id, @PathVariable String status) {
        log.info("Updating task {} status to {}", id, status);
        
        Task updated = taskService.updateTaskStatus(id, status);
        writeAuditLog("UPDATE_STATUS", id, "Status changed to " + status);

        String statusLabel = status.replace("_", " ");
        broadcastActivity("🔄 " + getCurrentUserName() + " moved \"" + updated.getTitle() + "\" → " + statusLabel, getCurrentUserName());

        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/tasks/" + id, updated);
        }

        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/assign/{assigneeId}")
    public ResponseEntity<Task> assignTask(@PathVariable String id, @PathVariable String assigneeId) {
        log.info("Assigning task {} to {}", id, assigneeId);
        
        Task updated = taskService.assignTask(id, assigneeId);
        writeAuditLog("ASSIGN", id, "Assigned to " + updated.getAssignee().getName());
        broadcastActivity("👤 " + getCurrentUserName() + " assigned \"" + updated.getTitle() + "\" to " + updated.getAssignee().getName(), getCurrentUserName());

        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/tasks/" + id, updated);
        }

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable String id) {
        log.info("Deleting task: {}", id);
        
        Optional<Task> taskOpt = taskRepository.findById(id);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        taskService.deleteTask(id);
        writeAuditLog("DELETE", id, "Task deleted");
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{taskId}/comments")
    public ResponseEntity<Comment> addComment(@PathVariable String taskId, @RequestBody CommentRequest request) {
        log.info("Adding comment to task: {}", taskId);
        
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Comment comment = Comment.builder()
                .id(UUID.randomUUID().toString())
                .task(taskOpt.get())
                .user(userOpt.get())
                .content(request.getContent())
                .build();

        Comment saved = commentRepository.save(comment);
        
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/tasks/" + taskId + "/comments", saved);
        }

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{taskId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable String taskId) {
        log.info("Fetching comments for task: {}", taskId);
        return ResponseEntity.ok(commentRepository.findByTaskId(taskId));
    }

    @PostMapping("/{taskId}/time-logs")
    public ResponseEntity<TimeLog> logTime(@PathVariable String taskId, @RequestBody TimeLogRequest request) {
        log.info("Logging time for task: {}", taskId);
        
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        TimeLog timeLog = TimeLog.builder()
                .id(UUID.randomUUID().toString())
                .task(taskOpt.get())
                .user(userOpt.get())
                .hoursSpent(request.getHoursSpent())
                .notes(request.getNotes())
                .build();

        return ResponseEntity.ok(timeLogRepository.save(timeLog));
    }

    @GetMapping("/{taskId}/time-logs")
    public ResponseEntity<List<TimeLog>> getTimeLogs(@PathVariable String taskId) {
        log.info("Fetching time logs for task: {}", taskId);
        return ResponseEntity.ok(timeLogRepository.findByTaskId(taskId));
    }

    @GetMapping("/{taskId}/subtasks")
    public ResponseEntity<List<Subtask>> getSubtasks(@PathVariable String taskId) {
        log.info("Fetching subtasks for task: {}", taskId);
        return ResponseEntity.ok(subtaskRepository.findByTaskId(taskId));
    }

    @PostMapping("/{taskId}/subtasks")
    public ResponseEntity<Subtask> createSubtask(@PathVariable String taskId, @RequestBody Map<String, String> body) {
        log.info("Creating subtask for task: {}", taskId);
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String title = body.get("title");
        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Subtask subtask = Subtask.builder()
                .id(UUID.randomUUID().toString())
                .task(taskOpt.get())
                .title(title.trim())
                .isCompleted(false)
                .build();
        Subtask saved = subtaskRepository.save(subtask);
        writeAuditLog("CREATE_SUBTASK", taskId, "Subtask created: " + title);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/subtasks/{subtaskId}")
    public ResponseEntity<Subtask> updateSubtask(@PathVariable String subtaskId, @RequestBody Map<String, Object> body) {
        log.info("Updating subtask: {}", subtaskId);
        Optional<Subtask> subtaskOpt = subtaskRepository.findById(subtaskId);
        if (subtaskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Subtask subtask = subtaskOpt.get();
        if (body.containsKey("title")) {
            subtask.setTitle((String) body.get("title"));
        }
        if (body.containsKey("isCompleted")) {
            subtask.setCompleted((Boolean) body.get("isCompleted"));
        }
        Subtask saved = subtaskRepository.save(subtask);
        writeAuditLog("UPDATE_SUBTASK", subtask.getTask().getId(), "Subtask updated: " + subtask.getTitle());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/subtasks/{subtaskId}")
    public ResponseEntity<?> deleteSubtask(@PathVariable String subtaskId) {
        log.info("Deleting subtask: {}", subtaskId);
        Optional<Subtask> subtaskOpt = subtaskRepository.findById(subtaskId);
        if (subtaskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Subtask subtask = subtaskOpt.get();
        subtaskRepository.deleteById(subtaskId);
        writeAuditLog("DELETE_SUBTASK", subtask.getTask().getId(), "Subtask deleted: " + subtask.getTitle());
        return ResponseEntity.ok().build();
    }
}
