package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.model.*;
import com.saas.pm.repository.*;
import com.saas.pm.service.EmailService;
import com.saas.pm.service.TenantSchemaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/collaboration")
@CrossOrigin
@Slf4j
public class CollaborationController {

    private final InvitationRepository invitationRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final TenantSchemaService tenantSchemaService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Autowired
    public CollaborationController(InvitationRepository invitationRepository,
                                   JoinRequestRepository joinRequestRepository,
                                   TenantRepository tenantRepository,
                                   UserRepository userRepository,
                                   EmailService emailService,
                                   TenantSchemaService tenantSchemaService,
                                   PasswordEncoder passwordEncoder) {
        this.invitationRepository = invitationRepository;
        this.joinRequestRepository = joinRequestRepository;
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.tenantSchemaService = tenantSchemaService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Team Leader invites a user by email.
     */
    @PostMapping("/invite")
    public ResponseEntity<?> inviteUser(@RequestBody Map<String, String> body) {
        String activeTenant = TenantContext.getCurrentTenant();
        String email = body.get("email");
        String role = body.getOrDefault("role", "DEVELOPER");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        email = email.trim().toLowerCase();

        if (activeTenant.equalsIgnoreCase("public") || activeTenant.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("Invalid workspace context.");
        }

        // Check if user already exists in this tenant
        String[] existingUser = tenantSchemaService.findUserByEmail(activeTenant, email);
        if (existingUser != null) {
            return ResponseEntity.badRequest().body("User with this email is already a member of this workspace.");
        }

        // Find tenant info
        Optional<Tenant> tenantOpt = tenantRepository.findById(activeTenant);
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Workspace not found.");
        }
        Tenant tenant = tenantOpt.get();

        // Create or update invitation token
        String token = UUID.randomUUID().toString();
        Optional<Invitation> existingInviteOpt = invitationRepository.findByEmailAndTenantId(email, activeTenant);
        Invitation invitation;
        if (existingInviteOpt.isPresent()) {
            invitation = existingInviteOpt.get();
            invitation.setToken(token);
            invitation.setRole(role);
            invitation.setStatus("PENDING");
        } else {
            invitation = Invitation.builder()
                    .id(UUID.randomUUID().toString())
                    .email(email)
                    .tenantId(activeTenant)
                    .token(token)
                    .role(role)
                    .status("PENDING")
                    .build();
        }
        invitationRepository.save(invitation);

        // Send email with accept invite link
        String baseUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        String inviteUrl = baseUrl + "/join/invite?token=" + token;
        String subject = "You've been invited to join " + tenant.getName() + " on SaaSGrid!";
        String text = "Hi there,\n\n" +
                "You have been invited to join the '" + tenant.getName() + "' workspace on SaaSGrid as a " + role + ".\n\n" +
                "Click the link below to accept the invitation and sign in:\n" +
                inviteUrl + "\n\n" +
                "Best regards,\nThe SaaSGrid Team";

        emailService.sendEmail(email, subject, text);

        return ResponseEntity.ok(Map.of("message", "Invitation sent successfully to " + email));
    }

    /**
     * Validates invitation token.
     */
    @GetMapping("/invite/validate")
    public ResponseEntity<?> validateInvite(@RequestParam String token) {
        Optional<Invitation> inviteOpt = invitationRepository.findByToken(token);
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid or expired invitation token.");
        }

        Invitation invite = inviteOpt.get();
        if (!invite.getStatus().equalsIgnoreCase("PENDING")) {
            return ResponseEntity.badRequest().body("Invitation has already been accepted.");
        }

        Optional<Tenant> tenantOpt = tenantRepository.findById(invite.getTenantId());
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Workspace no longer exists.");
        }

        Tenant tenant = tenantOpt.get();
        return ResponseEntity.ok(Map.of(
                "email", invite.getEmail(),
                "role", invite.getRole(),
                "companyName", tenant.getName(),
                "subdomain", tenant.getSubdomain(),
                "tenantId", tenant.getId()
        ));
    }

    /**
     * Teammate accepts invitation.
     */
    @PostMapping("/invite/accept")
    public ResponseEntity<?> acceptInvite(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String name = body.get("name");
        String password = body.getOrDefault("password", "");

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Invitation token is required.");
        }

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Your name is required.");
        }

        if (password == null || password.isBlank()) {
            password = "password123";
        }

        Optional<Invitation> inviteOpt = invitationRepository.findByToken(token);
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid invitation token.");
        }

        Invitation invite = inviteOpt.get();
        if (!invite.getStatus().equalsIgnoreCase("PENDING")) {
            return ResponseEntity.badRequest().body("Invitation already accepted.");
        }

        // Add user directly into the tenant schema
        String userId = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(password);
        tenantSchemaService.saveTenantUser(invite.getTenantId(), userId, invite.getEmail(), encodedPassword, name, "ROLE_NONE");

        // Update invitation status
        invite.setStatus("ACCEPTED");
        invitationRepository.save(invite);

        Optional<Tenant> tenantOpt = tenantRepository.findById(invite.getTenantId());
        return ResponseEntity.ok(Map.of(
                "message", "Invitation accepted successfully. You can now login.",
                "email", invite.getEmail(),
                "subdomain", tenantOpt.map(Tenant::getSubdomain).orElse(""),
                "tenantId", invite.getTenantId()
        ));
    }

    /**
     * User requests to join a Team Leader's workspace.
     */
    @PostMapping("/join-request")
    public ResponseEntity<?> requestToJoin(@RequestBody Map<String, String> body) {
        String leaderEmail = body.get("leaderEmail");
        String requesterEmail = body.get("requesterEmail");
        String requesterName = body.getOrDefault("requesterName", "A User");

        if (leaderEmail == null || leaderEmail.trim().isEmpty() || requesterEmail == null || requesterEmail.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Leader email and requester email are required.");
        }

        leaderEmail = leaderEmail.trim().toLowerCase();
        requesterEmail = requesterEmail.trim().toLowerCase();

        // Find tenant by leader's email (ownerEmail)
        List<Tenant> tenants = tenantRepository.findAll();
        Tenant matchingTenant = null;
        for (Tenant t : tenants) {
            if (leaderEmail.equalsIgnoreCase(t.getOwnerEmail())) {
                matchingTenant = t;
                break;
            }
        }

        if (matchingTenant == null) {
            return ResponseEntity.badRequest().body("No active workspace found owned by " + leaderEmail);
        }

        // Check if user is already a member
        String[] existing = tenantSchemaService.findUserByEmail(matchingTenant.getId(), requesterEmail);
        if (existing != null) {
            return ResponseEntity.badRequest().body("You are already a member of this workspace.");
        }

        // Check or create JoinRequest
        Optional<JoinRequest> requestOpt = joinRequestRepository.findByEmailAndTenantId(requesterEmail, matchingTenant.getId());
        JoinRequest jr;
        if (requestOpt.isPresent()) {
            jr = requestOpt.get();
            jr.setStatus("PENDING");
        } else {
            jr = JoinRequest.builder()
                    .id(UUID.randomUUID().toString())
                    .email(requesterEmail)
                    .tenantId(matchingTenant.getId())
                    .status("PENDING")
                    .build();
        }
        joinRequestRepository.save(jr);

        // Notify Team Leader via real email
        String approveUrl = "http://localhost:8888/login"; // Or specific path
        String subject = "New Join Request: " + requesterName + " wants to join your workspace!";
        String text = "Hi Team Leader,\n\n" +
                requesterName + " (" + requesterEmail + ") has requested to join your workspace '" + matchingTenant.getName() + "' on SaaSGrid.\n\n" +
                "Please log in to your dashboard Team Management section to Approve or Reject this request:\n" +
                approveUrl + "\n\n" +
                "Best regards,\nThe SaaSGrid Team";

        emailService.sendEmail(leaderEmail, subject, text);

        return ResponseEntity.ok(Map.of("message", "Join request sent successfully to " + leaderEmail));
    }

    /**
     * Fetch pending join requests (Admin only).
     */
    @GetMapping("/requests/pending")
    public ResponseEntity<?> getPendingRequests() {
        String activeTenant = TenantContext.getCurrentTenant();
        if (activeTenant.equalsIgnoreCase("public") || activeTenant.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("Invalid workspace context.");
        }

        List<JoinRequest> requests = joinRequestRepository.findByTenantIdAndStatus(activeTenant, "PENDING");
        return ResponseEntity.ok(requests);
    }

    /**
     * Resolve join request (APPROVE or REJECT).
     */
    @PostMapping("/requests/{requestId}/resolve")
    public ResponseEntity<?> resolveRequest(@PathVariable String requestId, @RequestBody Map<String, String> body) {
        String action = body.get("action"); // APPROVE or REJECT
        String activeTenant = TenantContext.getCurrentTenant();

        if (activeTenant.equalsIgnoreCase("public") || activeTenant.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("Invalid workspace context.");
        }

        Optional<JoinRequest> jrOpt = joinRequestRepository.findById(requestId);
        if (jrOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        JoinRequest jr = jrOpt.get();
        if (!jr.getTenantId().equals(activeTenant)) {
            return ResponseEntity.badRequest().body("Unauthorized for this workspace request.");
        }

        if ("APPROVE".equalsIgnoreCase(action)) {
            jr.setStatus("APPROVED");
            joinRequestRepository.save(jr);

            // Add user directly into the tenant schema
            String userId = UUID.randomUUID().toString();
            String tempPassword = passwordEncoder.encode("password123");
            tenantSchemaService.saveTenantUser(activeTenant, userId, jr.getEmail(), tempPassword, jr.getEmail().split("@")[0], "ROLE_NONE");

            // Notify requester via email
            String loginUrl = "http://localhost:8888/login";
            String subject = "Your request to join the workspace was approved!";
            String text = "Congratulations!\n\nYour request to join the workspace has been approved by the Team Leader.\n\n" +
                    "You can now log in using your Google account or email:\n" +
                    loginUrl + "\n\n" +
                    "Best regards,\nThe SaaSGrid Team";
            emailService.sendEmail(jr.getEmail(), subject, text);

            return ResponseEntity.ok(Map.of("message", "User approved and added to workspace."));
        } else {
            jr.setStatus("REJECTED");
            joinRequestRepository.save(jr);

            // Notify requester
            String subject = "Your request to join the workspace was declined";
            String text = "Hello,\n\nWe regret to inform you that your request to join the workspace was declined by the owner.\n\n" +
                    "Best regards,\nThe SaaSGrid Team";
            emailService.sendEmail(jr.getEmail(), subject, text);

            return ResponseEntity.ok(Map.of("message", "User request declined."));
        }
    }
}
