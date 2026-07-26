package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.service.TenantSchemaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.Map;

@RestController
@RequestMapping("/api/github-auth")
@CrossOrigin
@Slf4j
public class GitHubAuthController {

    @Value("${github.client-id}")
    private String clientId;

    @Value("${github.client-secret}")
    private String clientSecret;

    @Autowired
    private TenantSchemaService tenantSchemaService;

    @Autowired
    private DataSource dataSource;

    private final WebClient webClient = WebClient.builder().build();

    @GetMapping("/login")
    public ResponseEntity<?> redirectToGitHub() {
        String redirectUrl = "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&scope=repo"
                + "&redirect_uri=https://saas-grid-frontend.onrender.com/github/callback";

        return ResponseEntity.status(302).header("Location", redirectUrl).build();
    }

    @PostMapping("/exchange")
    public ResponseEntity<?> exchangeCodeForToken(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String tenantId = TenantContext.getCurrentTenant();

        try {
            Map response = webClient.post()
                    .uri("https://github.com/login/oauth/access_token")
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of(
                            "client_id", clientId,
                            "client_secret", clientSecret,
                            "code", code
                    ))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            String accessToken = (String) response.get("access_token");
            if (accessToken == null) {
                return ResponseEntity.status(400).body(Map.of("error", "Failed to get access token", "details", response));
            }

            tenantSchemaService.addColumnToTable("public.tenants", "github_access_token", "VARCHAR(255)");

            try (Connection conn = dataSource.getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "UPDATE public.tenants SET github_access_token = ? WHERE id = ?")) {
                ps.setString(1, accessToken);
                ps.setString(2, tenantId);
                ps.executeUpdate();
            }

            log.info("GitHub connected successfully for tenant: {}", tenantId);
            return ResponseEntity.ok(Map.of("message", "GitHub connected successfully"));

        } catch (Exception e) {
            log.error("GitHub token exchange failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> checkConnectionStatus() {
        String tenantId = TenantContext.getCurrentTenant();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT github_access_token FROM public.tenants WHERE id = ?")) {
            ps.setString(1, tenantId);
            var rs = ps.executeQuery();
            boolean connected = rs.next() && rs.getString("github_access_token") != null;
            return ResponseEntity.ok(Map.of("connected", connected));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("connected", false));
        }
    }
}
