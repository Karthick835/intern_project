package com.saas.pm.controller;

import com.saas.pm.dto.ProjectRequest;
import com.saas.pm.model.AuditLog;
import com.saas.pm.model.Project;
import com.saas.pm.model.User;
import com.saas.pm.repository.AuditLogRepository;
import com.saas.pm.repository.ProjectRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin
@Slf4j
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final com.saas.pm.service.ProjectService projectService;

    @Autowired
    public ProjectController(ProjectRepository projectRepository,
                             UserRepository userRepository,
                             AuditLogRepository auditLogRepository,
                             com.saas.pm.service.ProjectService projectService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.projectService = projectService;
    }

    private void writeAuditLog(String action, String entityId, String projectName) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            AuditLog audit = AuditLog.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .action(action)
                    .entity("PROJECT")
                    .entityId(entityId)
                    .build();
            auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write project audit log", e);
        }
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable String id) {
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody ProjectRequest request) {
        Project savedProject = projectService.createProject(
                request.getName(),
                request.getDescription(),
                request.getPriority() != null ? request.getPriority() : "MEDIUM",
                request.getStatus() != null ? request.getStatus() : "ACTIVE",
                request.getDeadline()
        );
        writeAuditLog("CREATE", savedProject.getId(), savedProject.getName());
        return ResponseEntity.ok(savedProject);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable String id, @RequestBody ProjectRequest request) {
        return projectRepository.findById(id)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setDescription(request.getDescription());
                    existing.setPriority(request.getPriority());
                    existing.setDeadline(request.getDeadline());
                    existing.setStatus(request.getStatus());
                    Project updated = projectRepository.save(existing);
                    writeAuditLog("UPDATE", updated.getId(), updated.getName());
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable String id) {
        return projectRepository.findById(id)
                .map(existing -> {
                    existing.setStatus("ARCHIVED");
                    projectRepository.save(existing);
                    writeAuditLog("ARCHIVE", existing.getId(), existing.getName());
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
