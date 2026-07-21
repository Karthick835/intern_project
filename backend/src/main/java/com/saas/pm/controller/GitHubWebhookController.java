package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.model.DevOpsCommit;
import com.saas.pm.model.Task;
import com.saas.pm.model.Tenant;
import com.saas.pm.repository.DevOpsCommitRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.TenantRepository;
import com.saas.pm.service.TenantSchemaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/webhooks")
@CrossOrigin
@Slf4j
public class GitHubWebhookController {

    private final DevOpsCommitRepository commitRepository;
    private final TaskRepository taskRepository;
    private final TenantRepository tenantRepository;
    private final TenantSchemaService tenantSchemaService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    public GitHubWebhookController(DevOpsCommitRepository commitRepository, 
                                   TaskRepository taskRepository,
                                   TenantRepository tenantRepository,
                                   TenantSchemaService tenantSchemaService) {
        this.commitRepository = commitRepository;
        this.taskRepository = taskRepository;
        this.tenantRepository = tenantRepository;
        this.tenantSchemaService = tenantSchemaService;
    }

    private void broadcastActivity(String tenantId, String content, String actorName) {
        if (messagingTemplate == null || tenantId == null) return;
        try {
            Map<String, Object> activity = new HashMap<>();
            activity.put("sender", actorName != null ? actorName : "GitHub Webhook");
            activity.put("content", content);
            activity.put("type", "ACTIVITY");
            activity.put("timestamp", LocalDateTime.now().toString());
            messagingTemplate.convertAndSend("/topic/messages/" + tenantId, activity);
        } catch (Exception e) {
            log.warn("Failed to broadcast webhook activity: {}", e.getMessage());
        }
    }

    @PostMapping("/github")
    public ResponseEntity<?> handleGlobalGitHubWebhook(
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "push") String eventType,
            @RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant,
            @RequestParam(value = "tenant", required = false) String paramTenant,
            @RequestParam(value = "tenantId", required = false) String paramTenantId,
            @RequestBody Map<String, Object> payload) {

        String tenantId = paramTenant != null ? paramTenant : (paramTenantId != null ? paramTenantId : headerTenant);
        if (tenantId == null || tenantId.trim().isEmpty()) {
            tenantId = TenantContext.getCurrentTenant();
        }

        return processGitHubPayload(tenantId, eventType, payload);
    }

    @PostMapping("/github/{tenantId}")
    public ResponseEntity<?> handleTenantGitHubWebhook(
            @PathVariable String tenantId,
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "push") String eventType,
            @RequestBody Map<String, Object> payload) {

        return processGitHubPayload(tenantId, eventType, payload);
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<?> processGitHubPayload(String rawTenant, String eventType, Map<String, Object> payload) {
        log.info("Received GitHub Webhook [{}] for raw tenant input: {}", eventType, rawTenant);

        try {
            // Resolve actual tenant UUID schema
            String resolvedTenantId = TenantContext.DEFAULT_TENANT;
            if (rawTenant != null && !rawTenant.trim().isEmpty()) {
                String cleanTenant = rawTenant.trim().toLowerCase();
                if (cleanTenant.contains("-")) {
                    resolvedTenantId = cleanTenant; // Already a UUID
                } else {
                    try {
                        resolvedTenantId = tenantRepository.findBySubdomain(cleanTenant)
                                .map(Tenant::getId)
                                .orElseGet(() -> {
                                    List<Tenant> list = tenantRepository.findAll();
                                    return !list.isEmpty() ? list.get(0).getId() : cleanTenant;
                                });
                    } catch (Exception e) {
                        log.warn("Failed to resolve tenant by subdomain {}: {}", cleanTenant, e.getMessage());
                    }
                }
            }

            // Ensure tenant database schema and tables exist
            try {
                tenantSchemaService.createTenantSchema(resolvedTenantId);
            } catch (Exception e) {
                log.warn("Schema init check warning for tenant {}: {}", resolvedTenantId, e.getMessage());
            }

            // Set tenant context for DB queries
            TenantContext.setCurrentTenant(resolvedTenantId);
            log.info("Resolved tenant UUID context for GitHub Webhook: {}", resolvedTenantId);

            if ("ping".equalsIgnoreCase(eventType)) {
                log.info("GitHub Webhook ping acknowledged for tenant: {}", resolvedTenantId);
                return ResponseEntity.ok(Map.of(
                        "status", "active",
                        "message", "GitHub Webhook configured successfully!",
                        "tenant", resolvedTenantId,
                        "timestamp", LocalDateTime.now().toString()
                ));
            }

            if ("push".equalsIgnoreCase(eventType) || payload.containsKey("commits")) {
                Map<String, Object> repoObj = (Map<String, Object>) payload.get("repository");
                String repoName = repoObj != null && repoObj.get("name") != null 
                        ? repoObj.get("name").toString() 
                        : "github-repo";

                List<Map<String, Object>> commits = (List<Map<String, Object>>) payload.get("commits");
                if (commits == null || commits.isEmpty()) {
                    // Single commit fallback or head_commit
                    Map<String, Object> headCommit = (Map<String, Object>) payload.get("head_commit");
                    if (headCommit != null) {
                        commits = List.of(headCommit);
                    }
                }

                if (commits == null || commits.isEmpty()) {
                    return ResponseEntity.ok(Map.of("message", "No commits found in payload"));
                }

                int savedCount = 0;
                int linkedCount = 0;

                for (Map<String, Object> c : commits) {
                    String fullHash = c.getOrDefault("id", UUID.randomUUID().toString()).toString();
                    String shortHash = fullHash.length() >= 8 ? fullHash.substring(0, 8) : fullHash;
                    String message = c.getOrDefault("message", "Commit from GitHub").toString();

                    String authorName = "GitHub Developer";
                    Map<String, Object> authorObj = (Map<String, Object>) c.get("author");
                    if (authorObj != null && authorObj.get("name") != null) {
                        authorName = authorObj.get("name").toString();
                    } else if (authorObj != null && authorObj.get("username") != null) {
                        authorName = authorObj.get("username").toString();
                    }

                    LocalDateTime commitTime = LocalDateTime.now();
                    if (c.get("timestamp") != null) {
                        try {
                            commitTime = LocalDateTime.parse(c.get("timestamp").toString(), DateTimeFormatter.ISO_DATE_TIME);
                        } catch (Exception ignored) {}
                    }

                    // Regex scan message for task ID matching (#af80ea80)
                    String linkedTaskId = null;
                    Pattern pattern = Pattern.compile("#([a-fA-F0-9]{8})");
                    Matcher matcher = pattern.matcher(message);
                    if (matcher.find()) {
                        String matchedCode = matcher.group(1);
                        List<Task> tasks = taskRepository.findAll();
                        for (Task t : tasks) {
                            if (t.getId().toLowerCase().startsWith(matchedCode.toLowerCase())) {
                                linkedTaskId = t.getId();
                                
                                // Auto-transition task to IN_REVIEW or DONE
                                String newStatus = "IN_REVIEW";
                                String msgLower = message.toLowerCase();
                                if (msgLower.contains("merge") || msgLower.contains("close") || msgLower.contains("resolve") || msgLower.contains("fix")) {
                                    newStatus = "DONE";
                                }
                                t.setStatus(newStatus);
                                taskRepository.save(t);
                                linkedCount++;
                                
                                broadcastActivity(resolvedTenantId, "automatically transitioned task '" + t.getTitle() + "' to " + newStatus.replace("_", " ") + " via GitHub Commit [" + shortHash + "]", authorName);
                                break;
                            }
                        }
                    }

                    DevOpsCommit commit = DevOpsCommit.builder()
                            .id(UUID.randomUUID().toString())
                            .tenantId(resolvedTenantId)
                            .repoName(repoName)
                            .author(authorName)
                            .hash(shortHash)
                            .message(message)
                            .taskId(linkedTaskId)
                            .timestamp(commitTime)
                            .build();

                    commitRepository.save(commit);
                    savedCount++;
                    broadcastActivity(resolvedTenantId, "pushed live GitHub commit [" + shortHash + "] to " + repoName + ": \"" + message + "\"", authorName);
                }

                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "tenant", resolvedTenantId,
                        "repository", repoName,
                        "processedCommits", savedCount,
                        "linkedTasks", linkedCount
                ));
            }

            return ResponseEntity.ok(Map.of("message", "Event acknowledged but no handler action required for: " + eventType));

        } catch (Exception e) {
            log.error("Failed to process GitHub webhook payload", e);
            return ResponseEntity.status(500).body(Map.of(
                    "status", "error",
                    "message", e.getMessage() != null ? e.getMessage() : "Failed to process webhook payload"
            ));
        }
    }
}
