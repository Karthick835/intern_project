package com.saas.pm.config;

import com.saas.pm.repository.TenantRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class TenantFilter implements Filter {

    @Autowired
    private TenantRepository tenantRepository;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        // 1. Try to get from header first
        String tenantIdOrSubdomain = req.getHeader("X-Tenant-ID");

        // 2. Check query parameter fallback (e.g. ?tenant=acmecompany or ?tenantId=...)
        if (tenantIdOrSubdomain == null || tenantIdOrSubdomain.trim().isEmpty()) {
            tenantIdOrSubdomain = req.getParameter("tenant");
        }
        if (tenantIdOrSubdomain == null || tenantIdOrSubdomain.trim().isEmpty()) {
            tenantIdOrSubdomain = req.getParameter("tenantId");
        }

        // 3. Fallback: Parse subdomain from Server Name (Host)
        if (tenantIdOrSubdomain == null || tenantIdOrSubdomain.trim().isEmpty()) {
            String serverName = req.getServerName(); // e.g. infosys.localhost or infosys.yourapp.com
            tenantIdOrSubdomain = parseTenantFromHost(serverName);
        }

        String tenantId = TenantContext.DEFAULT_TENANT;
        if (tenantIdOrSubdomain != null && !tenantIdOrSubdomain.trim().isEmpty()) {
            tenantIdOrSubdomain = tenantIdOrSubdomain.trim().toLowerCase();
            if (!tenantIdOrSubdomain.equals("public") && !tenantIdOrSubdomain.equals("default")) {
                if (tenantIdOrSubdomain.contains("-")) {
                    // Already a UUID
                    tenantId = tenantIdOrSubdomain;
                } else {
                    // Lookup UUID by subdomain in public schema
                    try {
                        tenantId = tenantRepository.findBySubdomain(tenantIdOrSubdomain)
                                .map(t -> t.getId())
                                .orElseGet(() -> {
                                    return tenantRepository.findAll().stream().findFirst().map(t -> t.getId()).orElse(TenantContext.DEFAULT_TENANT);
                                });
                    } catch (Exception e) {
                        log.error("Failed to resolve tenant by subdomain: {}", tenantIdOrSubdomain, e);
                        tenantId = tenantIdOrSubdomain;
                    }
                }
            }
        }

        // Set the context
        TenantContext.setCurrentTenant(tenantId);

        // Add headers to response for verification
        res.setHeader("X-Tenant-ID", TenantContext.getCurrentTenant());

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String parseTenantFromHost(String host) {
        if (host == null || host.equals("localhost") || host.equals("127.0.0.1") || host.equals("yourapp.com")) {
            return TenantContext.DEFAULT_TENANT;
        }

        // Expect format: tenant.domain.suffix
        // Split by dots and get the first part if it has multiple segments
        String[] parts = host.split("\\.");
        if (parts.length > 1) {
            // E.g. "infosys.localhost" -> "infosys"
            // E.g. "tcs.yourapp.com" -> "tcs"
            String subdomain = parts[0];
            if (subdomain.equalsIgnoreCase("www") || subdomain.equalsIgnoreCase("api")) {
                return TenantContext.DEFAULT_TENANT;
            }
            return subdomain;
        }

        return TenantContext.DEFAULT_TENANT;
    }
}
