package com.saas.pm.controller;

import com.saas.pm.model.Sprint;
import com.saas.pm.model.Task;
import com.saas.pm.repository.SprintRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.service.AiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin
@Slf4j
public class AiController {

    private final AiService aiService;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;

    @Autowired
    public AiController(AiService aiService,
                        SprintRepository sprintRepository,
                        TaskRepository taskRepository) {
        this.aiService = aiService;
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
    }

    @PostMapping("/suggest")
    public ResponseEntity<?> getAssignmentSuggestion(@RequestBody Map<String, String> body) {
        log.info("AI suggestion request for task assignment");
        
        String title = body.getOrDefault("title", "");
        String description = body.getOrDefault("description", "");
        
        if (title.isEmpty()) {
            return ResponseEntity.badRequest().body("Task title is required");
        }

        Map<String, Object> suggestion = aiService.suggestAssigneeAndPriority(title, description);
        return ResponseEntity.ok(suggestion);
    }

    @PostMapping("/estimate")
    public ResponseEntity<?> getHourEstimation(@RequestBody Map<String, String> body) {
        log.info("AI estimation request for task");
        
        String title = body.getOrDefault("title", "");
        String description = body.getOrDefault("description", "");
        
        if (title.isEmpty()) {
            return ResponseEntity.badRequest().body("Task title is required");
        }

        Map<String, Object> estimate = aiService.estimateTaskHours(title, description);
        return ResponseEntity.ok(estimate);
    }

    @GetMapping("/sprint-summary/{sprintId}")
    public ResponseEntity<?> getSprintSummaryReport(@PathVariable String sprintId) {
        log.info("Generating AI summary for sprint: {}", sprintId);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(sprintId);
        if (sprintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Sprint sprint = sprintOpt.get();
        List<Task> tasks = taskRepository.findBySprintId(sprintId);
        
        String summary = aiService.generateSprintSummary(sprint, tasks);
        
        Map<String, Object> result = Map.of(
                "sprintId", sprintId,
                "sprintName", sprint.getName(),
                "summary", summary
        );
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/priority-suggest")
    public ResponseEntity<?> suggestPriority(@RequestBody Map<String, String> body) {
        log.info("AI priority suggestion request");
        
        String title = body.getOrDefault("title", "");
        String description = body.getOrDefault("description", "");
        
        if (title.isEmpty()) {
            return ResponseEntity.badRequest().body("Task title is required");
        }

        Map<String, Object> suggestion = aiService.suggestAssigneeAndPriority(title, description);
        
        Map<String, Object> result = Map.of(
                "priority", suggestion.getOrDefault("suggestedPriority", "MEDIUM"),
                "reason", suggestion.getOrDefault("reason", ""),
                "confidence", suggestion.getOrDefault("confidence", 0.0)
        );
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithWorkspace(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Claude-API-Key", required = false) String customApiKey) {
        log.info("AI Chat endpoint invoked with message");
        String message = body.getOrDefault("message", "");
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().body("Message is required");
        }
        Map<String, Object> result = aiService.chatWithWorkspace(message, customApiKey);
        return ResponseEntity.ok(result);
    }
}
