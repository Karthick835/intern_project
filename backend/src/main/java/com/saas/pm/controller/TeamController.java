package com.saas.pm.controller;

import com.saas.pm.config.JwtUtils;
import com.saas.pm.config.TenantContext;
import com.saas.pm.dto.InviteRequest;
import com.saas.pm.model.AuditLog;
import com.saas.pm.model.User;
import com.saas.pm.repository.AuditLogRepository;
import com.saas.pm.repository.UserRepository;
import com.saas.pm.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/team")
@CrossOrigin
@Slf4j
public class TeamController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    public TeamController(UserService userService, 
                         UserRepository userRepository,
                         AuditLogRepository auditLogRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    private void writeAuditLog(String action, String entityId, String details) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            AuditLog audit = AuditLog.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .action(action)
                    .entity("USER")
                    .entityId(entityId)
                    .build();
            auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log", e);
        }
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllTeamMembers() {
        log.info("Fetching all team members");
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getTeamMember(@PathVariable String id) {
        log.info("Fetching team member: {}", id);
        return userService.getUser(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getTeamMembersByRole(@PathVariable String role) {
        log.info("Fetching team members with role: {}", role);
        return ResponseEntity.ok(userService.getUsersByRole(role));
    }

    @PostMapping("/invite")
    public ResponseEntity<?> inviteTeamMember(@RequestBody InviteRequest request) {
        log.info("Inviting team member: {}", request.getEmail());
        
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("User already exists");
        }

        try {
            User newUser = userService.createUser(
                    request.getEmail(),
                    UUID.randomUUID().toString(), // Generate random password for now
                    request.getName(),
                    request.getRole() != null ? request.getRole() : "DEVELOPER"
            );
            writeAuditLog("INVITE", newUser.getId(), "Invited " + newUser.getEmail());
            return ResponseEntity.ok(newUser);
        } catch (com.saas.pm.exception.PlanLimitExceededException e) {
            throw e;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateTeamMember(@PathVariable String id, @RequestBody InviteRequest request) {
        log.info("Updating team member: {}", id);
        
        try {
            User updated = userService.updateUser(id, request.getName(), request.getRole());
            writeAuditLog("UPDATE", id, "Updated user details");
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeTeamMember(@PathVariable String id) {
        log.info("Removing team member: {}", id);
        
        try {
            userService.deleteUser(id);
            writeAuditLog("DELETE", id, "Removed from team");
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/claim-role")
    public ResponseEntity<?> claimRole(@RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Role is required.");
        }
        
        roleStr = roleStr.trim().toUpperCase();
        if (!roleStr.equals("ROLE_ADMIN") && !roleStr.equals("DEVELOPER") && !roleStr.equals("ROLE_NONE")) {
            return ResponseEntity.badRequest().body("Invalid role. Role must be 'ROLE_ADMIN', 'DEVELOPER', or 'ROLE_NONE'.");
        }

        // Get current user email
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found.");
        }
        User user = userOpt.get();

        if (roleStr.equals("ROLE_ADMIN")) {
            // Enforce single Team Leader in the workspace
            List<User> leaders = userRepository.findByRole("ROLE_ADMIN");
            List<User> companyAdmins = userRepository.findByRole("COMPANY_ADMIN");
            if (!leaders.isEmpty() || !companyAdmins.isEmpty()) {
                return ResponseEntity.badRequest().body("There is already a Team Leader in this workspace.");
            }
        }

        // Update role
        user.setRole(roleStr);
        userRepository.save(user);

        writeAuditLog("CLAIM_ROLE", user.getId(), "Claimed role " + roleStr);

        // Generate brand new JWT token
        String tenantId = TenantContext.getCurrentTenant();
        String newToken = jwtUtils.generateJwtToken(user.getEmail(), user.getName(), roleStr, tenantId);

        return ResponseEntity.ok(Map.of(
                "message", "Role claimed successfully.",
                "role", roleStr,
                "token", newToken
        ));
    }

    @PostMapping("/transfer-leadership")
    public ResponseEntity<?> transferLeadership(@RequestBody Map<String, String> body) {
        String targetUserId = body.get("targetUserId");
        if (targetUserId == null || targetUserId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Target User ID is required.");
        }

        // Get current user email
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> currentUserOpt = userRepository.findByEmail(currentEmail);
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Current user not found.");
        }
        User currentUser = currentUserOpt.get();

        // Enforce that caller must be the Team Leader
        String callerRole = currentUser.getRole();
        if (!callerRole.equals("ROLE_ADMIN") && !callerRole.equals("COMPANY_ADMIN")) {
            return ResponseEntity.status(403).body("Only the current Team Leader can transfer their position.");
        }

        // Find target user
        Optional<User> targetUserOpt = userRepository.findById(targetUserId);
        if (targetUserOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Target user not found.");
        }
        User targetUser = targetUserOpt.get();

        if (targetUser.getId().equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body("You cannot transfer leadership to yourself.");
        }

        // Transfer roles
        targetUser.setRole("ROLE_ADMIN");
        currentUser.setRole("DEVELOPER");

        userRepository.save(targetUser);
        userRepository.save(currentUser);

        writeAuditLog("TRANSFER_LEADERSHIP", targetUser.getId(), "Transferred Team Leader role to " + targetUser.getEmail());

        // Generate brand new token for the demoted caller
        String tenantId = TenantContext.getCurrentTenant();
        String newToken = jwtUtils.generateJwtToken(currentUser.getEmail(), currentUser.getName(), "DEVELOPER", tenantId);

        return ResponseEntity.ok(Map.of(
                "message", "Leadership transferred successfully. You are now a Team Member.",
                "role", "DEVELOPER",
                "token", newToken
        ));
    }
}
