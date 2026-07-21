package com.saas.pm.controller;

import com.saas.pm.model.Project;
import com.saas.pm.model.Sprint;
import com.saas.pm.model.Task;
import com.saas.pm.model.User;
import com.saas.pm.model.AuditLog;
import com.saas.pm.repository.ProjectRepository;
import com.saas.pm.repository.SprintRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.UserRepository;
import com.saas.pm.repository.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin
@Slf4j
public class DashboardController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Autowired
    public DashboardController(ProjectRepository projectRepository,
                              TaskRepository taskRepository,
                              SprintRepository sprintRepository,
                              UserRepository userRepository,
                              AuditLogRepository auditLogRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/activity")
    public ResponseEntity<List<AuditLog>> getActivityFeed() {
        log.info("Fetching latest activity feed");
        List<AuditLog> logs = auditLogRepository.findAllByOrderByTimestampDesc();
        if (logs.size() > 15) {
            logs = logs.subList(0, 15);
        }
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview() {
        log.info("Fetching dashboard overview");
        
        List<Project> projects = projectRepository.findAll();
        List<Task> tasks = taskRepository.findAll();
        List<Sprint> sprints = sprintRepository.findAll();
        List<User> users = userRepository.findAll();

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalProjects", projects.size());
        overview.put("activeProjects", projects.stream().filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus())).count());
        overview.put("totalTasks", tasks.size());
        overview.put("completedTasks", tasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.getStatus())).count());
        overview.put("totalSprints", sprints.size());
        overview.put("activeSprints", sprints.stream().filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).count());
        overview.put("totalTeamMembers", users.size());

        return ResponseEntity.ok(overview);
    }

    @GetMapping("/workload")
    public ResponseEntity<Map<String, Object>> getTeamWorkload() {
        log.info("Calculating team workload");
        
        List<User> users = userRepository.findAll();
        List<Task> tasks = taskRepository.findAll();

        Map<String, Object> workloadData = new HashMap<>();
        Map<String, Integer> workload = new HashMap<>();

        for (User user : users) {
            int hoursAssigned = tasks.stream()
                    .filter(t -> user.equals(t.getAssignee()) && !"DONE".equalsIgnoreCase(t.getStatus()))
                    .mapToInt(t -> t.getTimeEstimate() != null ? t.getTimeEstimate() : 0)
                    .sum();
            workload.put(user.getName(), hoursAssigned);
        }

        workloadData.put("workload", workload);
        workloadData.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(workloadData);
    }

    @GetMapping("/velocity-chart")
    public ResponseEntity<Map<String, Object>> getVelocityChart() {
        log.info("Fetching velocity data");

        // Include ALL sprints (ACTIVE + COMPLETED), not just COMPLETED
        List<Sprint> allSprints = sprintRepository.findAll();
        List<Task> allTasks = taskRepository.findAll();

        // Calculate velocity per sprint by counting DONE tasks linked to each sprint
        Map<String, Integer> velocityData = new LinkedHashMap<>();
        for (Sprint sprint : allSprints) {
            long doneTasks = allTasks.stream()
                    .filter(t -> t.getSprint() != null
                            && t.getSprint().getId().equals(sprint.getId())
                            && "DONE".equalsIgnoreCase(t.getStatus()))
                    .count();
            velocityData.put(sprint.getName(), (int) doneTasks);
        }

        double average = velocityData.values().stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);

        Map<String, Object> result = new HashMap<>();
        result.put("velocities", velocityData);
        result.put("averageVelocity", average);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/task-distribution")
    public ResponseEntity<Map<String, Object>> getTaskDistribution() {
        log.info("Calculating task distribution");
        
        List<Task> tasks = taskRepository.findAll();
        
        Map<String, Object> distribution = new HashMap<>();
        distribution.put("byStatus", tasks.stream()
                .collect(Collectors.groupingByConcurrent(Task::getStatus, Collectors.counting())));
        distribution.put("byPriority", tasks.stream()
                .collect(Collectors.groupingByConcurrent(Task::getPriority, Collectors.counting())));
        distribution.put("byType", tasks.stream()
                .collect(Collectors.groupingByConcurrent(Task::getType, Collectors.counting())));

        return ResponseEntity.ok(distribution);
    }

    @GetMapping("/overdue-tasks")
    public ResponseEntity<List<Task>> getOverdueTasks() {
        log.info("Fetching overdue tasks");
        
        List<Task> tasks = taskRepository.findAll();
        List<Task> overdue = tasks.stream()
                .filter(t -> t.getDueDate() != null && 
                           t.getDueDate().isBefore(java.time.LocalDate.now()) && 
                           !"DONE".equalsIgnoreCase(t.getStatus()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(overdue);
    }

    @GetMapping("/project-health")
    public ResponseEntity<Map<String, Object>> getProjectHealth() {
        log.info("Calculating project health");
        
        List<Project> projects = projectRepository.findAll();
        List<Task> allTasks = taskRepository.findAll();

        Map<String, Object> healthData = new HashMap<>();
        
        for (Project project : projects) {
            List<Task> projectTasks = allTasks.stream()
                    .filter(t -> project.equals(t.getProject()))
                    .collect(Collectors.toList());
            
            if (projectTasks.isEmpty()) continue;
            
            long completedTasks = projectTasks.stream()
                    .filter(t -> "DONE".equalsIgnoreCase(t.getStatus()))
                    .count();
            
            int completionPercentage = (int) ((completedTasks * 100) / projectTasks.size());
            
            Map<String, Object> projectHealth = new HashMap<>();
            projectHealth.put("completionPercentage", completionPercentage);
            projectHealth.put("totalTasks", projectTasks.size());
            projectHealth.put("completedTasks", completedTasks);
            projectHealth.put("health", completionPercentage >= 70 ? "GOOD" : completionPercentage >= 40 ? "FAIR" : "POOR");
            
            healthData.put(project.getName(), projectHealth);
        }

        return ResponseEntity.ok(healthData);
    }
}
