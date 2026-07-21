package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.model.DevOpsCommit;
import com.saas.pm.model.Task;
import com.saas.pm.model.User;
import com.saas.pm.repository.DevOpsCommitRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.saas.pm.model.DevOpsRepo;
import com.saas.pm.repository.DevOpsRepoRepository;

@RestController
@RequestMapping("/api/devops")
@CrossOrigin
@Slf4j
public class DevOpsController {

    @Autowired
    private DevOpsCommitRepository commitRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DevOpsRepoRepository repoRepository;

    @Autowired
    private com.saas.pm.service.AiService aiService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    // In-memory list to track live pipelines
    private final List<Map<String, Object>> pipelines = new ArrayList<>();

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

    @GetMapping("/repos")
    public ResponseEntity<List<DevOpsRepo>> getRepos(@RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant) {
        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        List<DevOpsRepo> list = repoRepository.findByTenantId(tenantId);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/repos")
    public ResponseEntity<?> createRepo(
            @RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant,
            @RequestBody Map<String, String> body) {
        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        String name = body.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Repository name is required"));
        }

        String lang = body.getOrDefault("lang", "Other");
        String desc = body.getOrDefault("desc", "");

        // Check duplicate
        List<DevOpsRepo> existing = repoRepository.findByTenantId(tenantId);
        for (DevOpsRepo r : existing) {
            if (r.getName().equalsIgnoreCase(name.trim())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Repository name already exists"));
            }
        }

        DevOpsRepo repo = DevOpsRepo.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .name(name.trim())
                .lang(lang)
                .desc(desc)
                .createdAt(LocalDateTime.now())
                .build();

        repoRepository.save(repo);
        broadcastActivity("created a new code repository: " + repo.getName(), null);

        return ResponseEntity.ok(repo);
    }

    @GetMapping("/repos/{repoName}/files")
    public ResponseEntity<Map<String, Object>> getRepoFiles(@PathVariable String repoName) {
        List<Map<String, String>> files = Arrays.asList(
            Map.of("path", "README.md", "type", "doc", "content", "# " + repoName + "\n\nPrimary source code repository for workspace service.\n\n## Getting Started\n\n```bash\ngit clone https://github.com/workspace/" + repoName + ".git\ncd " + repoName + "\nnpm install\nnpm run dev\n```"),
            Map.of("path", "src/App.jsx", "type", "code", "content", "import React from 'react'\n\nexport default function App() {\n  return (\n    <div className=\"p-6 max-w-4xl mx-auto\">\n      <h1 className=\"text-2xl font-bold\">" + repoName + " App</h1>\n      <p>Microservice active and connected.</p>\n    </div>\n  )\n}"),
            Map.of("path", "package.json", "type", "config", "content", "{\n  \"name\": \"" + repoName + "\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\"\n  }\n}"),
            Map.of("path", "Dockerfile", "type", "docker", "content", "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 8080\nCMD [\"npm\", \"run\", \"dev\"]")
        );

        List<String> branches = Arrays.asList("main", "staging", "feature/auth-guard", "patch/v1.1");

        Map<String, Object> result = new HashMap<>();
        result.put("repoName", repoName);
        result.put("branches", branches);
        result.put("files", files);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/commits")
    public ResponseEntity<List<DevOpsCommit>> getCommits(@RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant) {
        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        List<DevOpsCommit> list = commitRepository.findByTenantId(tenantId);
        // Sort by timestamp desc
        list.sort((c1, c2) -> c2.getTimestamp().compareTo(c1.getTimestamp()));
        return ResponseEntity.ok(list);
    }

    @GetMapping("/commits/task/{taskId}")
    public ResponseEntity<List<DevOpsCommit>> getCommitsForTask(@PathVariable String taskId) {
        return ResponseEntity.ok(commitRepository.findByTaskId(taskId));
    }

    @PostMapping("/commit")
    public ResponseEntity<Map<String, Object>> createCommit(
            @RequestHeader(value = "X-Tenant-ID", required = false) String headerTenant,
            @RequestBody Map<String, String> body) {

        String tenantId = headerTenant != null ? headerTenant : TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        String repoName = body.getOrDefault("repoName", "auth-service");
        String message = body.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Commit message is required"));
        }

        String author = body.getOrDefault("author", "Developer");
        String hash = UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        // Regex scan message for any hash matching task ID prefix (e.g. #b73a21ef or #TSK-102)
        String linkedTaskId = null;
        String matchedCode = null;
        Pattern pattern = Pattern.compile("#([a-fA-F0-9]{8})");
        Matcher matcher = pattern.matcher(message);
        if (matcher.find()) {
            matchedCode = matcher.group(1);
            log.info("Found task ID prefix match: {}", matchedCode);
        }

        if (matchedCode != null) {
            // Find task whose ID starts with this prefix
            List<Task> tasks = taskRepository.findAll();
            for (Task t : tasks) {
                if (t.getId().toLowerCase().startsWith(matchedCode.toLowerCase())) {
                    linkedTaskId = t.getId();
                    log.info("Successfully linked commit to task: {} ({})", t.getTitle(), t.getId());
                    
                    // Auto-transition task to IN_REVIEW or DONE
                    String newStatus = "IN_REVIEW";
                    if (message.toLowerCase().contains("merge") || message.toLowerCase().contains("close") || message.toLowerCase().contains("resolve")) {
                        newStatus = "DONE";
                    }
                    t.setStatus(newStatus);
                    taskRepository.save(t);
                    broadcastActivity("automatically transitioned task '" + t.getTitle() + "' to " + newStatus.replace("_", " ") + " via Git Commit [" + hash + "]", author);
                    break;
                }
            }
        }

        DevOpsCommit commit = DevOpsCommit.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .repoName(repoName)
                .author(author)
                .hash(hash)
                .message(message)
                .taskId(linkedTaskId)
                .timestamp(LocalDateTime.now())
                .build();

        commitRepository.save(commit);
        broadcastActivity("pushed commit [" + hash + "] to " + repoName + ": \"" + message + "\"", author);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Commit saved successfully");
        resp.put("commit", commit);
        resp.put("linkedTaskId", linkedTaskId);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/pipelines")
    public ResponseEntity<List<Map<String, Object>>> getPipelines() {
        return ResponseEntity.ok(pipelines);
    }

    @PostMapping("/pipeline/run")
    public ResponseEntity<Map<String, Object>> runPipeline(@RequestBody Map<String, String> body) {
        String repoName = body.getOrDefault("repoName", "auth-service");
        String branch = body.getOrDefault("branch", "main");
        String triggeredBy = body.getOrDefault("triggeredBy", "Developer");

        String runId = "pl-" + (pipelines.size() + 101);
        Map<String, Object> newPipeline = new HashMap<>();
        newPipeline.put("id", runId);
        newPipeline.put("name", "Pipeline #" + (pipelines.size() + 101));
        newPipeline.put("repo", repoName);
        newPipeline.put("branch", branch);
        newPipeline.put("status", "RUNNING");
        newPipeline.put("duration", "Running...");
        newPipeline.put("triggeredBy", triggeredBy);
        newPipeline.put("timestamp", LocalDateTime.now().toString());

        pipelines.add(0, newPipeline); // Add to top
        broadcastActivity("triggered CI/CD pipeline run for " + repoName + " [" + branch + "]", triggeredBy);

        return ResponseEntity.ok(newPipeline);
    }

    @PostMapping("/pipeline/{id}/complete")
    public ResponseEntity<?> completePipeline(@PathVariable String id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "SUCCESS");
        String duration = body.getOrDefault("duration", "1m 45s");

        for (Map<String, Object> pl : pipelines) {
            if (id.equals(pl.get("id"))) {
                pl.put("status", status);
                pl.put("duration", duration);
                broadcastActivity("CI/CD pipeline run " + pl.get("name") + " finished with status: " + status, "GitHub Action");
                break;
            }
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ai-review")
    public ResponseEntity<Map<String, Object>> generateAiCodeReview(@RequestBody Map<String, String> body) {
        String hash = body.getOrDefault("hash", "a4f912c3");
        String message = body.getOrDefault("message", "feat: integrate API authentication");
        String repoName = body.getOrDefault("repoName", "auth-service");

        Map<String, Object> review = aiService.generateCodeReview(hash, message, repoName);
        return ResponseEntity.ok(review);
    }
}
