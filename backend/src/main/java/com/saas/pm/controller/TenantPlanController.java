package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.config.PlanLimits;
import com.saas.pm.model.Tenant;
import com.saas.pm.repository.TenantRepository;
import com.saas.pm.repository.ProjectRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tenant")
@CrossOrigin
@Slf4j
public class TenantPlanController {

    private final TenantRepository tenantRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Autowired
    public TenantPlanController(TenantRepository tenantRepository,
                                ProjectRepository projectRepository,
                                UserRepository userRepository) {
        this.tenantRepository = tenantRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/plan-status")
    public ResponseEntity<?> getPlanStatus() {
        String tenantId = TenantContext.getCurrentTenant();
        log.info("Fetching plan status for tenant: {}", tenantId);

        if (tenantId == null || tenantId.equalsIgnoreCase("public") || tenantId.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("No active tenant context");
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.notFound().build();
        }

        PlanLimits.LimitDetails limits = PlanLimits.getLimits("PRO");

        Map<String, Object> status = new HashMap<>();
        status.put("plan", "PRO");
        status.put("subdomain", tenant.getSubdomain());
        status.put("companyName", tenant.getName());

        // Usage counts in active schema
        long projectCount = projectRepository.count();
        long memberCount = userRepository.count();

        status.put("projectCount", projectCount);
        status.put("memberCount", memberCount);

        // Limits mapping
        status.put("maxProjects", limits.maxProjects);
        status.put("maxMembers", limits.maxMembers);
        status.put("maxTasksPerProject", limits.maxTasksPerProject);
        status.put("analyticsUnlocked", limits.analyticsUnlocked);
        status.put("attachmentsUnlocked", limits.attachmentsUnlocked);
        status.put("activityLogUnlocked", limits.activityLogUnlocked);

        return ResponseEntity.ok(status);
    }

    @PostMapping("/upgrade-pro")
    public ResponseEntity<?> upgradeToPro() {
        String tenantId = TenantContext.getCurrentTenant();
        log.info("Upgrading tenant {} to PRO", tenantId);

        if (tenantId == null || tenantId.equalsIgnoreCase("public") || tenantId.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("No active tenant context");
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.notFound().build();
        }

        tenant.setPlan("PRO");
        tenantRepository.save(tenant);

        return ResponseEntity.ok(tenant);
    }
}
