package com.saas.pm.config;

import com.saas.pm.service.TenantSchemaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private TenantSchemaService tenantSchemaService;

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        log.info("🤖 Starting Database Migration Runner to ensure DevOps and Docs tables exist...");
        
        try (Connection connection = dataSource.getConnection();
             Statement stmt = connection.createStatement()) {
            
            // Check if tenants table exists in the public schema
            boolean tenantsTableExists = false;
            try {
                stmt.executeQuery("SELECT 1 FROM public.tenants LIMIT 1");
                tenantsTableExists = true;
            } catch (Exception e) {
                log.warn("public.tenants table not found or not initialized yet. Skipping migration.");
            }

            if (tenantsTableExists) {
                List<String> tenantIds = new ArrayList<>();
                try (ResultSet rs = stmt.executeQuery("SELECT id FROM public.tenants")) {
                    while (rs.next()) {
                        tenantIds.add(rs.getString("id"));
                    }
                }
                
                log.info("Found {} tenants for database verification: {}", tenantIds.size(), tenantIds);
                for (String tenantId : tenantIds) {
                    try {
                        tenantSchemaService.createTenantSchema(tenantId);
                        log.info("Successfully validated schema tables for tenant: {}", tenantId);
                    } catch (Exception e) {
                        log.error("Failed to run schema validation for tenant: " + tenantId, e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error occurred during database migration checks", e);
        }
    }
}
