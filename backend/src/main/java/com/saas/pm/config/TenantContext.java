package com.saas.pm.config;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TenantContext {
    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();
    public static final String DEFAULT_TENANT = "public";

    public static void setCurrentTenant(String tenantId) {
        currentTenant.set(tenantId);
    }

    public static String getCurrentTenant() {
        String tenant = currentTenant.get();
        return tenant != null ? tenant : DEFAULT_TENANT;
    }

    public static void clear() {
        currentTenant.remove();
    }
}
