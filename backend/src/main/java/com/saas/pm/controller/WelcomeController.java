package com.saas.pm.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public Map<String, Object> welcome() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Welcome to Multi-Tenant SaaS Project Management Tool");
        response.put("status", "API is running and ready!");
        response.put("version", "1.0.0");
        response.put("endpoints", Map.of(
            "swagger_ui", "http://localhost:8080/swagger-ui.html",
            "api_docs", "http://localhost:8080/v3/api-docs",
            "h2_console", "http://localhost:8080/h2-console"
        ));
        response.put("quick_start", Map.of(
            "step_1", "Go to Swagger UI: http://localhost:8080/swagger-ui.html",
            "step_2", "Register tenant: POST /api/auth/register-tenant",
            "step_3", "Login: POST /api/auth/login",
            "step_4", "Copy JWT token from response",
            "step_5", "Click Authorize button and paste token with 'Bearer ' prefix",
            "step_6", "Now you can test all APIs!"
        ));
        response.put("features", new String[]{
            "Multi-tenant SaaS architecture",
            "JWT Authentication",
            "Project Management",
            "Sprint Planning",
            "Task Management",
            "Team Collaboration",
            "AI-powered suggestions",
            "Analytics & Dashboards",
            "Real-time WebSocket support",
            "Complete audit logging"
        });
        return response;
    }

    @GetMapping("/api/welcome")
    public Map<String, String> apiWelcome() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "SaaS Project Management API");
        response.put("documentation", "http://localhost:8080/swagger-ui.html");
        response.put("status", "Running ✓");
        return response;
    }
}
