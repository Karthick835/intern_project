package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.model.Project;
import com.saas.pm.model.Task;
import com.saas.pm.model.WikiDoc;
import com.saas.pm.repository.ProjectRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.WikiDocRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/docs")
@CrossOrigin
@Slf4j
public class DocController {

    @Autowired
    private WikiDocRepository wikiDocRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @GetMapping
    public ResponseEntity<List<WikiDoc>> getDocs(@RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant) {
        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        log.info("Fetching wiki docs for tenant: {}", tenantId);
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(wikiDocRepository.findByTenantId(tenantId));
    }

    @PostMapping
    public ResponseEntity<WikiDoc> saveDoc(
            @RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant,
            @RequestBody Map<String, String> body) {
        
        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        log.info("Saving wiki doc for tenant: {}", tenantId);
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        String id = body.get("id");
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }

        WikiDoc doc = WikiDoc.builder()
                .id(id)
                .tenantId(tenantId)
                .title(body.getOrDefault("title", "Untitled Document"))
                .content(body.getOrDefault("content", ""))
                .updatedBy(body.getOrDefault("updatedBy", "Anonymous"))
                .updatedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(wikiDocRepository.save(doc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDoc(@PathVariable String id) {
        log.info("Deleting wiki doc: {}", id);
        wikiDocRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    /**
     * AI parses the document and auto-generates backlog task cards in the project.
     */
    @PostMapping("/{id}/ai-tasks")
    public ResponseEntity<?> generateAiTasks(
            @RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant,
            @PathVariable String id) {

        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        log.info("AI generating tasks from doc {} for tenant: {}", id, tenantId);
        if (tenantId == null) {
            return ResponseEntity.badRequest().body("Missing tenant context");
        }

        Optional<WikiDoc> docOpt = wikiDocRepository.findById(id);
        if (docOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        WikiDoc doc = docOpt.get();

        // 1. Get or create a project to attach tasks to
        List<Project> projects = projectRepository.findAll(); // check all projects or filter
        Project targetProject = null;
        for (Project p : projects) {
            // Find project matching tenant
            if (tenantId.equalsIgnoreCase(TenantContext.getCurrentTenant())) {
                targetProject = p;
                break;
            }
        }

        if (targetProject == null && !projects.isEmpty()) {
            targetProject = projects.get(0);
        }

        if (targetProject == null) {
            // Create a default project
            targetProject = Project.builder()
                    .id(UUID.randomUUID().toString())
                    .name("Main Workspace")
                    .description("Default project workspace for tasks")
                    .priority("MEDIUM")
                    .build();
            targetProject = projectRepository.save(targetProject);
        }

        // 2. Parse text content to extract potential tasks
        String content = doc.getContent();
        List<String> rawLines = content != null ? Arrays.asList(content.split("\\n")) : new ArrayList<>();
        List<Map<String, String>> extractedTasks = new ArrayList<>();

        for (String line : rawLines) {
            line = line.trim();
            // Look for checklist patterns like "- [ ] task", "* task", "TODO: task", or bullet items
            if (line.startsWith("- [ ]") || line.startsWith("-") || line.startsWith("*") || line.toLowerCase().startsWith("todo:")) {
                String taskText = line;
                if (line.startsWith("- [ ]")) taskText = line.substring(5).trim();
                else if (line.startsWith("-") || line.startsWith("*")) taskText = line.substring(1).trim();
                else if (line.toLowerCase().startsWith("todo:")) taskText = line.substring(5).trim();

                if (taskText.length() > 3) {
                    // Make it a task
                    Map<String, String> t = new HashMap<>();
                    t.put("title", taskText);
                    t.put("description", "Auto-generated from specification document: " + doc.getTitle());
                    
                    // Simple priority deduction
                    if (taskText.toLowerCase().contains("urgent") || taskText.toLowerCase().contains("critical") || taskText.toLowerCase().contains("fix")) {
                        t.put("priority", "HIGH");
                    } else if (taskText.toLowerCase().contains("later") || taskText.toLowerCase().contains("cleanup")) {
                        t.put("priority", "LOW");
                    } else {
                        t.put("priority", "MEDIUM");
                    }
                    extractedTasks.add(t);
                }
            }
        }

        // Default tasks fallback if no list items were found
        if (extractedTasks.isEmpty()) {
            Map<String, String> t1 = new HashMap<>();
            t1.put("title", "Review Specification: " + doc.getTitle());
            t1.put("description", "Analyze document requirements and compile implementation checklist.");
            t1.put("priority", "HIGH");
            extractedTasks.add(t1);

            Map<String, String> t2 = new HashMap<>();
            t2.put("title", "Implement Architecture: " + doc.getTitle());
            t2.put("description", "Code the database models, API controllers, and schema rules.");
            t2.put("priority", "MEDIUM");
            extractedTasks.add(t2);
        }

        // 3. Save tasks to backlog (TO_DO status)
        List<Task> savedTasks = new ArrayList<>();
        for (Map<String, String> ext : extractedTasks) {
            Task task = Task.builder()
                    .id(UUID.randomUUID().toString())
                    .title(ext.get("title"))
                    .description(ext.get("description"))
                    .priority(ext.get("priority"))
                    .type("FEATURE")
                    .status("TO_DO")
                    .project(targetProject)
                    .build();
            savedTasks.add(taskRepository.save(task));
        }

        return ResponseEntity.ok(Map.of(
                "message", "AI successfully generated " + savedTasks.size() + " backlog tasks!",
                "count", savedTasks.size()
        ));
    }
}
