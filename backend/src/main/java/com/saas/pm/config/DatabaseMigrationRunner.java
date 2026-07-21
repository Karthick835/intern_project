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
import java.util.UUID;

@Component
@Slf4j
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private org.springframework.core.env.Environment env;

    @Autowired
    private TenantSchemaService tenantSchemaService;

    @Autowired
    private DataSource dataSource;

    @jakarta.annotation.PostConstruct
    public void initLog() {
        String dbUrl = env.getProperty("spring.datasource.url");
        log.info("🤖 [POST-CONSTRUCT] Configured Database URL: {}", dbUrl);
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("🤖 Starting Database Migration & Data Preservation Runner...");

        try (Connection connection = dataSource.getConnection();
             Statement stmt = connection.createStatement()) {

            // Ensure public.tenants has owner_email column (automated migration)
            try {
                stmt.executeUpdate("ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_email VARCHAR(100)");
                log.info("Successfully checked/added owner_email column to public.tenants.");
            } catch (Exception e) {
                log.warn("Could not auto-migrate public.tenants table (might already be up to date): {}", e.getMessage());
            }

            // Check if tenants table exists in public schema
            boolean tenantsTableExists = false;
            try {
                stmt.executeQuery("SELECT 1 FROM public.tenants LIMIT 1");
                tenantsTableExists = true;
            } catch (Exception e) {
                log.warn("public.tenants table not found yet. Skipping runner.");
            }

            if (tenantsTableExists) {
                List<String> tenantIds = new ArrayList<>();
                try (ResultSet rs = stmt.executeQuery("SELECT id FROM public.tenants")) {
                    while (rs.next()) {
                        tenantIds.add(rs.getString("id"));
                    }
                }

                log.info("Found {} tenant schemas in database for validation & data seed check.", tenantIds.size());
                for (String tenantId : tenantIds) {
                    try {
                        // 1. Ensure schema and tables exist
                        tenantSchemaService.createTenantSchema(tenantId);
                        String schemaName = "tenant_" + tenantId.replace("-", "");

                        // 2. Check if tenant has projects
                        int projectCount = 0;
                        try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM " + schemaName + ".projects")) {
                            if (rs.next()) {
                                projectCount = rs.getInt(1);
                            }
                        }

                        log.info("Tenant schema {} has {} projects.", schemaName, projectCount);

                        // 3. Seed default workspace project & tasks if empty
                        if (projectCount == 0) {
                            log.info("Seeding default workspace project and tasks into schema {}...", schemaName);
                            seedDefaultProjectData(stmt, schemaName);
                        }

                    } catch (Exception e) {
                        log.error("Error processing tenant schema for ID: " + tenantId, e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error during database migration runner", e);
        }
    }

    private void seedDefaultProjectData(Statement stmt, String schemaName) {
        try {
            String projectId = UUID.randomUUID().toString();
            String sprintId = UUID.randomUUID().toString();

            // Insert default project
            stmt.executeUpdate(String.format(
                "INSERT INTO %s.projects (id, name, description, priority, deadline, status, created_at) VALUES " +
                "('%s', 'Main Product Development', 'Core SaaS application development and cloud infrastructure management.', 'HIGH', CURRENT_DATE + 30, 'IN_PROGRESS', CURRENT_TIMESTAMP)",
                schemaName, projectId
            ));

            // Insert default sprint
            stmt.executeUpdate(String.format(
                "INSERT INTO %s.sprints (id, name, start_date, end_date, status, velocity, created_at) VALUES " +
                "('%s', 'Sprint 1 - Cloud Launch', CURRENT_DATE, CURRENT_DATE + 14, 'ACTIVE', 45, CURRENT_TIMESTAMP)",
                schemaName, sprintId
            ));

            // Insert sample tasks
            String t1 = UUID.randomUUID().toString();
            String t2 = UUID.randomUUID().toString();
            String t3 = UUID.randomUUID().toString();

            stmt.executeUpdate(String.format(
                "INSERT INTO %s.tasks (id, title, description, priority, type, status, time_estimate, sprint_id, project_id, created_at) VALUES " +
                "('%s', 'Deploy SaaS Application to Cloud', 'Set up Docker multi-stage containers and deploy frontend & backend to Render.', 'HIGH', 'FEATURE', 'DONE', 16, '%s', '%s', CURRENT_TIMESTAMP)," +
                "('%s', 'Configure OAuth Security & CORS', 'Ensure HTTPS origin policies and Google Sign-In SDK tokens work cleanly.', 'MEDIUM', 'FEATURE', 'IN_PROGRESS', 8, '%s', '%s', CURRENT_TIMESTAMP)," +
                "('%s', 'Sprint Planning & Backlog Grooming', 'Review story points, user capacity, and velocity burndown reports.', 'LOW', 'TASK', 'TODO', 4, '%s', '%s', CURRENT_TIMESTAMP)",
                schemaName,
                t1, sprintId, projectId,
                t2, sprintId, projectId,
                t3, sprintId, projectId
            ));

            log.info("Successfully seeded default project data into schema {}", schemaName);
        } catch (Exception e) {
            log.error("Failed to seed default project data into schema " + schemaName, e);
        }
    }
}
