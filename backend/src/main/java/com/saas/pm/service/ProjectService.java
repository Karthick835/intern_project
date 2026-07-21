package com.saas.pm.service;

import com.saas.pm.model.Project;
import com.saas.pm.model.User;
import com.saas.pm.repository.ProjectRepository;
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

@Service
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public Project createProject(String name, String description, String priority, 
                                String status, java.time.LocalDate deadline) {
        log.info("Creating project: {}", name);
        
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null && !tenantId.equalsIgnoreCase("public") && !tenantId.equalsIgnoreCase("default")) {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseGet(() -> tenantRepository.findBySubdomain(tenantId).orElse(null));
            if (tenant != null) {
                log.info("Creating project '{}' for tenant {}", name, tenant.getSubdomain());
            }
        }
        
        Project project = Project.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .description(description)
                .priority(priority)
                .status(status)
                .deadline(deadline)
                .build();
        
        return projectRepository.save(project);
    }

    public Project updateProject(String projectId, Project projectUpdate) {
        log.info("Updating project: {}", projectId);
        
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }
        
        Project project = projectOpt.get();
        if (projectUpdate.getName() != null) project.setName(projectUpdate.getName());
        if (projectUpdate.getDescription() != null) project.setDescription(projectUpdate.getDescription());
        if (projectUpdate.getPriority() != null) project.setPriority(projectUpdate.getPriority());
        if (projectUpdate.getStatus() != null) project.setStatus(projectUpdate.getStatus());
        if (projectUpdate.getDeadline() != null) project.setDeadline(projectUpdate.getDeadline());
        
        return projectRepository.save(project);
    }

    public Optional<Project> getProject(String projectId) {
        log.info("Fetching project: {}", projectId);
        return projectRepository.findById(projectId);
    }

    public List<Project> getAllProjects() {
        log.info("Fetching all projects");
        return projectRepository.findAll();
    }

    public void deleteProject(String projectId) {
        log.info("Deleting project: {}", projectId);
        projectRepository.deleteById(projectId);
    }

    public List<Project> getProjectsByStatus(String status) {
        log.info("Fetching projects with status: {}", status);
        return projectRepository.findByStatus(status);
    }
}
