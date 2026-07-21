package com.saas.pm.controller;

import com.saas.pm.dto.SprintRequest;
import com.saas.pm.model.Sprint;
import com.saas.pm.model.Task;
import com.saas.pm.repository.SprintRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.service.SprintService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/sprints")
@CrossOrigin
@Slf4j
public class SprintController {

    private final SprintService sprintService;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;

    @Autowired
    public SprintController(SprintService sprintService, 
                           SprintRepository sprintRepository, 
                           TaskRepository taskRepository) {
        this.sprintService = sprintService;
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public ResponseEntity<List<Sprint>> getAllSprints() {
        log.info("Fetching all sprints");
        return ResponseEntity.ok(sprintService.getAllSprints());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sprint> getSprint(@PathVariable String id) {
        log.info("Fetching sprint: {}", id);
        return sprintService.getSprint(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Sprint>> getSprintsByStatus(@PathVariable String status) {
        log.info("Fetching sprints with status: {}", status);
        return ResponseEntity.ok(sprintService.getSprintsByStatus(status));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveSprint() {
        log.info("Fetching active sprint");
        List<Sprint> activeSprints = sprintService.getSprintsByStatus("ACTIVE");
        if (activeSprints.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activeSprints.get(0));
    }

    @PostMapping
    public ResponseEntity<Sprint> createSprint(@RequestBody SprintRequest request) {
        log.info("Creating sprint: {}", request.getName());
        
        Sprint sprint = sprintService.createSprint(
                request.getName(),
                request.getStartDate(),
                request.getEndDate(),
                request.getStatus() != null ? request.getStatus() : "BACKLOG"
        );

        return ResponseEntity.ok(sprint);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sprint> updateSprint(@PathVariable String id, @RequestBody SprintRequest request) {
        log.info("Updating sprint: {}", id);
        
        Sprint sprintUpdate = Sprint.builder()
                .name(request.getName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus())
                .retrospective(request.getRetrospective())
                .build();

        try {
            Sprint updated = sprintService.updateSprint(id, sprintUpdate);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSprint(@PathVariable String id) {
        log.info("Deleting sprint: {}", id);
        try {
            sprintService.deleteSprint(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/velocity")
    public ResponseEntity<Map<String, Object>> getSprintVelocity(@PathVariable String id) {
        log.info("Calculating velocity for sprint: {}", id);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(id);
        if (sprintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Sprint sprint = sprintOpt.get();
        Integer velocity = sprintService.calculateVelocity(id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("sprintId", id);
        result.put("sprintName", sprint.getName());
        result.put("velocity", velocity);
        result.put("status", sprint.getStatus());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/burndown")
    public ResponseEntity<Map<String, Object>> getBurndownChart(@PathVariable String id) {
        log.info("Getting burndown chart for sprint: {}", id);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(id);
        if (sprintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Sprint sprint = sprintOpt.get();
        List<Task> sprintTasks = taskRepository.findBySprintId(id);
        
        long totalDays = ChronoUnit.DAYS.between(sprint.getStartDate(), sprint.getEndDate());
        int totalEstimate = sprintTasks.stream()
                .mapToInt(t -> t.getTimeEstimate() != null ? t.getTimeEstimate() : 0)
                .sum();
        int completedEstimate = sprintTasks.stream()
                .filter(t -> "DONE".equalsIgnoreCase(t.getStatus()))
                .mapToInt(t -> t.getTimeEstimate() != null ? t.getTimeEstimate() : 0)
                .sum();
        int remainingEstimate = totalEstimate - completedEstimate;

        Map<String, Object> result = new HashMap<>();
        result.put("sprintId", id);
        result.put("sprintName", sprint.getName());
        result.put("totalDays", totalDays);
        result.put("totalEstimate", totalEstimate);
        result.put("completedEstimate", completedEstimate);
        result.put("remainingEstimate", remainingEstimate);
        result.put("completionPercentage", totalEstimate > 0 ? (completedEstimate * 100) / totalEstimate : 0);
        result.put("taskCount", sprintTasks.size());
        result.put("completedTaskCount", sprintTasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.getStatus())).count());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Sprint> startSprint(@PathVariable String id) {
        log.info("Starting sprint: {}", id);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(id);
        if (sprintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Sprint sprint = sprintOpt.get();
        sprint.setStatus("ACTIVE");
        Sprint updated = sprintRepository.save(sprint);

        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Sprint> completeSprint(@PathVariable String id) {
        log.info("Completing sprint: {}", id);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(id);
        if (sprintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Sprint sprint = sprintOpt.get();
        sprint.setStatus("COMPLETED");
        sprint.setVelocity(sprintService.calculateVelocity(id));
        Sprint updated = sprintRepository.save(sprint);

        return ResponseEntity.ok(updated);
    }
}
