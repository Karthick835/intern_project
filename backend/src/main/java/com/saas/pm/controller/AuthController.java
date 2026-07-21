package com.saas.pm.controller;

import com.saas.pm.config.JwtUtils;
import com.saas.pm.config.TenantContext;
import com.saas.pm.dto.*;
import com.saas.pm.model.*;
import com.saas.pm.repository.*;
import com.saas.pm.service.TenantSchemaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
@Slf4j
public class AuthController {

    private final TenantRepository tenantRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final TenantSchemaService tenantSchemaService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Autowired
    public AuthController(TenantRepository tenantRepository,
                          SubscriptionRepository subscriptionRepository,
                          UserRepository userRepository,
                          TenantSchemaService tenantSchemaService,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager,
                          JwtUtils jwtUtils) {
        this.tenantRepository = tenantRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.tenantSchemaService = tenantSchemaService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerTenant(@RequestBody RegisterTenantRequest request) {
        log.info("Received registration request for subdomain: {}", request.getSubdomain());

        String subdomain = request.getSubdomain().toLowerCase().replaceAll("[^a-zA-Z0-9_]", "");
        if (tenantRepository.findBySubdomain(subdomain).isPresent()) {
            return ResponseEntity.badRequest().body("Subdomain '" + subdomain + "' is already taken.");
        }

        // 1. Create tenant registry in public schema
        String tenantId = UUID.randomUUID().toString();
        String initialPlan = request.getPlan();
        if ("ENTERPRISE".equalsIgnoreCase(initialPlan)) {
            initialPlan = "FREE";
        }
        Tenant tenant = Tenant.builder()
                .id(tenantId)
                .name(request.getCompanyName())
                .subdomain(subdomain)
                .plan(initialPlan)
                .ownerEmail(request.getAdminEmail())
                .build();
        tenantRepository.save(tenant);

        // 2. Create subscription
        Subscription subscription = Subscription.builder()
                .id(UUID.randomUUID().toString())
                .tenant(tenant)
                .plan(initialPlan)
                .status("ACTIVE")
                .expiry(LocalDate.now().plusYears(1))
                .build();
        subscriptionRepository.save(subscription);

        // 3. Dynamically create database schema for tenant
        tenantSchemaService.createTenantSchema(tenantId);

        // 4. Save administrator user directly via JDBC (not JPA) into the new schema
        String adminId = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(request.getAdminPassword());
        tenantSchemaService.saveAdminUser(tenantId, adminId, request.getAdminEmail(), encodedPassword, request.getAdminName());
        log.info("Successfully registered tenant admin for {}", request.getAdminEmail());

        return ResponseEntity.ok("Registration successful. Workspace created at " + subdomain + ".localhost");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String resolvedTenant = TenantContext.getCurrentTenant();
        log.info("Login request for user: {} in tenant context: {}", request.getEmail(), resolvedTenant);

        if (resolvedTenant.equalsIgnoreCase("public") || resolvedTenant.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("Please specify a valid company subdomain to log in.");
        }

        // Resolve by tenant ID or subdomain string
        Optional<Tenant> tenantOpt = tenantRepository.findById(resolvedTenant);
        if (tenantOpt.isEmpty()) {
            tenantOpt = tenantRepository.findBySubdomain(resolvedTenant);
            if (tenantOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Workspace not found.");
            }
            resolvedTenant = tenantOpt.get().getId();
            TenantContext.setCurrentTenant(resolvedTenant);
        }

        Tenant tenant = tenantOpt.get();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Use JDBC directly to bypass Hibernate schema-switching issue
            String[] userData = tenantSchemaService.findUserByEmail(resolvedTenant, request.getEmail());
            if (userData == null) throw new RuntimeException("User not found after auth");

            String token = jwtUtils.generateJwtToken(
                    userData[1], // email
                    userData[3], // name
                    userData[4], // role
                    tenant.getId()
            );

            LoginResponse response = LoginResponse.builder()
                    .token(token)
                    .email(userData[1])
                    .name(userData[3])
                    .role(userData[4])
                    .tenantId(tenant.getId())
                    .subdomain(tenant.getSubdomain())
                    .plan(tenant.getPlan())
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Authentication failed for user: " + request.getEmail() + " in tenant " + tenant.getSubdomain(), e);
            return ResponseEntity.status(401).body("Invalid email or password.");
        }
    }

    @PostMapping("/invite")
    public ResponseEntity<?> inviteUser(@RequestBody InviteRequest request) {
        String activeTenant = TenantContext.getCurrentTenant();
        log.info("Inviting user {} to tenant: {}", request.getEmail(), activeTenant);

        if (activeTenant.equalsIgnoreCase("public") || activeTenant.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("Invalid workspace context.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("User with email '" + request.getEmail() + "' already exists.");
        }

        User newUser = User.builder()
                .id(UUID.randomUUID().toString())
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode("password123"))
                .role(request.getRole())
                .build();

        userRepository.save(newUser);
        return ResponseEntity.ok("User invited successfully. They can login with password 'password123'.");
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String accessToken = body.get("idToken"); // reusing idToken field for access token
        String emailFromFrontend = body.get("email");
        String nameFromFrontend  = body.get("name");

        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest().body("Missing Google token.");
        }

        // Verify email from frontend or Google userinfo endpoint
        String email = emailFromFrontend;
        String name = nameFromFrontend != null && !nameFromFrontend.isBlank() ? nameFromFrontend : (email != null ? email.split("@")[0] : "Google User");

        if ((email == null || email.isBlank()) && accessToken != null && !"mock-google-token".equals(accessToken)) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setBearerAuth(accessToken);
                org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
                org.springframework.http.ResponseEntity<Map> googleResp = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    Map.class
                );
                Map<String, Object> userInfo = googleResp.getBody();
                if (userInfo != null) {
                    email = (String) userInfo.get("email");
                    name  = (String) userInfo.getOrDefault("name", name);
                }
            } catch (Exception e) {
                log.error("Google token verification fallback error: {}", e.getMessage());
            }
        }

        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).body("Could not retrieve email from Google.");
        }

        String cleanEmail = email.trim().toLowerCase();

        // 1. Direct lookup by owner email
        Optional<Tenant> existingTenantOpt = tenantRepository.findByOwnerEmail(cleanEmail);
        if (existingTenantOpt.isPresent()) {
            Tenant tenant = existingTenantOpt.get();
            String[] userData = tenantSchemaService.findUserByEmail(tenant.getId(), cleanEmail);
            String userName = (userData != null && userData.length > 3 && userData[3] != null) ? userData[3] : (name != null ? name : cleanEmail);
            String userRole = (userData != null && userData.length > 4 && userData[4] != null) ? userData[4] : "ROLE_NONE";

            String token = jwtUtils.generateJwtToken(cleanEmail, userName, userRole, tenant.getId());
            LoginResponse response = LoginResponse.builder()
                    .token(token)
                    .email(cleanEmail)
                    .name(userName)
                    .role(userRole)
                    .tenantId(tenant.getId())
                    .subdomain(tenant.getSubdomain())
                    .plan(tenant.getPlan())
                    .build();
            log.info("Google login successful for owner {} in workspace {}", cleanEmail, tenant.getSubdomain());
            return ResponseEntity.ok(response);
        }

        // 2. Search all tenant schemas for user email
        List<Tenant> allTenants = tenantRepository.findAll();
        for (Tenant tenant : allTenants) {
            try {
                String[] userData = tenantSchemaService.findUserByEmail(tenant.getId(), cleanEmail);
                if (userData != null) {
                    String token = jwtUtils.generateJwtToken(
                            userData[1], userData[3], userData[4], tenant.getId());
                    LoginResponse response = LoginResponse.builder()
                            .token(token)
                            .email(userData[1])
                            .name(userData[3])
                            .role(userData[4])
                            .tenantId(tenant.getId())
                            .subdomain(tenant.getSubdomain())
                            .plan(tenant.getPlan())
                            .build();
                    log.info("Google login successful for {} in tenant {}", cleanEmail, tenant.getSubdomain());
                    return ResponseEntity.ok(response);
                }
            } catch (Exception ignored) {}
        }

        // New user — ask them to set up their workspace
        log.info("New Google user: {} — needs workspace setup", cleanEmail);
        return ResponseEntity.status(202).body(Map.of(
                "needsWorkspace", true,
                "email", cleanEmail,
                "name", name != null ? name : cleanEmail
        ));
    }

    @PostMapping("/google/setup")
    public ResponseEntity<?> googleSetupWorkspace(@RequestBody Map<String, String> body) {
        String email       = body.get("email");
        String name        = body.get("name");
        String companyName = body.get("companyName");
        String subdomain   = body.get("subdomain");
        String plan        = body.getOrDefault("plan", "FREE");

        if (email == null || companyName == null || subdomain == null) {
            return ResponseEntity.badRequest().body("Missing required fields.");
        }

        String cleanEmail = email.trim().toLowerCase();

        subdomain = subdomain.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (subdomain.isBlank()) {
            return ResponseEntity.badRequest().body("Invalid subdomain.");
        }
        if (tenantRepository.findBySubdomain(subdomain).isPresent()) {
            return ResponseEntity.badRequest().body("Workspace name '" + subdomain + "' is already taken. Please choose another.");
        }

        String tenantId = UUID.randomUUID().toString();
        Tenant newTenant = Tenant.builder()
                .id(tenantId)
                .name(companyName)
                .subdomain(subdomain)
                .ownerEmail(cleanEmail)
                .plan(plan)
                .build();
        tenantRepository.save(newTenant);

        Subscription subscription = Subscription.builder()
                .id(UUID.randomUUID().toString())
                .tenant(newTenant)
                .plan(plan)
                .status("ACTIVE")
                .expiry(LocalDate.now().plusYears(1))
                .build();
        subscriptionRepository.save(subscription);

        tenantSchemaService.createTenantSchema(tenantId);
        String adminId   = UUID.randomUUID().toString();
        String randomPwd = passwordEncoder.encode(UUID.randomUUID().toString());
        tenantSchemaService.saveTenantUser(tenantId, adminId, cleanEmail, randomPwd, name != null ? name : cleanEmail, "ROLE_NONE");

        String token = jwtUtils.generateJwtToken(cleanEmail, name != null ? name : cleanEmail, "ROLE_NONE", tenantId);
        LoginResponse response = LoginResponse.builder()
                .token(token)
                .email(cleanEmail)
                .name(name != null ? name : cleanEmail)
                .role("ROLE_NONE")
                .tenantId(tenantId)
                .subdomain(subdomain)
                .plan(plan)
                .build();

        log.info("Workspace '{}' created for Google owner {}", subdomain, cleanEmail);
        return ResponseEntity.ok(response);
    }
}

