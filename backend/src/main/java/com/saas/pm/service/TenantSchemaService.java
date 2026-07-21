package com.saas.pm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;

@Service
@Slf4j
public class TenantSchemaService {

    private final DataSource dataSource;

    @Autowired
    public TenantSchemaService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void createTenantSchema(String tenantId) {
        String sanitizedTenant = tenantId.replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
        String schemaName = "tenant_" + sanitizedTenant;

        log.info("Creating database schema for tenant: {}", schemaName);

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (Statement stmt = connection.createStatement()) {
                // 1. Create the schema itself
                stmt.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

                // 2. Create all tables directly with schema-prefixed names
                // This is more reliable than SET SCHEMA with HikariCP connection pooling
                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".users (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "email VARCHAR(100) UNIQUE NOT NULL, " +
                    "password VARCHAR(100) NOT NULL, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "role VARCHAR(50) NOT NULL, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".projects (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "description TEXT, " +
                    "priority VARCHAR(20) NOT NULL, " +
                    "deadline DATE, " +
                    "status VARCHAR(50) NOT NULL, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".sprints (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "start_date DATE NOT NULL, " +
                    "end_date DATE NOT NULL, " +
                    "status VARCHAR(50) NOT NULL, " +
                    "velocity INT DEFAULT 0, " +
                    "retrospective TEXT, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".tasks (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "title VARCHAR(200) NOT NULL, " +
                    "description TEXT, " +
                    "priority VARCHAR(20) NOT NULL, " +
                    "type VARCHAR(20) NOT NULL, " +
                    "status VARCHAR(50) NOT NULL, " +
                    "assignee_id VARCHAR(50), " +
                    "due_date DATE, " +
                    "time_estimate INT, " +
                    "sprint_id VARCHAR(50), " +
                    "project_id VARCHAR(50) NOT NULL, " +
                    "blocked_by_id VARCHAR(50), " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (assignee_id) REFERENCES " + schemaName + ".users(id), " +
                    "FOREIGN KEY (sprint_id) REFERENCES " + schemaName + ".sprints(id), " +
                    "FOREIGN KEY (project_id) REFERENCES " + schemaName + ".projects(id), " +
                    "FOREIGN KEY (blocked_by_id) REFERENCES " + schemaName + ".tasks(id) ON DELETE SET NULL)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".subtasks (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "task_id VARCHAR(50) NOT NULL, " +
                    "title VARCHAR(200) NOT NULL, " +
                    "is_completed BOOLEAN NOT NULL DEFAULT FALSE, " +
                    "FOREIGN KEY (task_id) REFERENCES " + schemaName + ".tasks(id) ON DELETE CASCADE)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".comments (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "task_id VARCHAR(50) NOT NULL, " +
                    "user_id VARCHAR(50) NOT NULL, " +
                    "content TEXT NOT NULL, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (task_id) REFERENCES " + schemaName + ".tasks(id) ON DELETE CASCADE, " +
                    "FOREIGN KEY (user_id) REFERENCES " + schemaName + ".users(id))");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".notifications (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "user_id VARCHAR(50) NOT NULL, " +
                    "content TEXT NOT NULL, " +
                    "is_read BOOLEAN NOT NULL DEFAULT FALSE, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (user_id) REFERENCES " + schemaName + ".users(id) ON DELETE CASCADE)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".audit_logs (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "user_id VARCHAR(50), " +
                    "action VARCHAR(100) NOT NULL, " +
                    "entity VARCHAR(100) NOT NULL, " +
                    "entity_id VARCHAR(50), " +
                    "timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (user_id) REFERENCES " + schemaName + ".users(id) ON DELETE SET NULL)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".time_logs (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "task_id VARCHAR(50) NOT NULL, " +
                    "user_id VARCHAR(50) NOT NULL, " +
                    "hours_spent INT NOT NULL, " +
                    "notes TEXT, " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (task_id) REFERENCES " + schemaName + ".tasks(id) ON DELETE CASCADE, " +
                    "FOREIGN KEY (user_id) REFERENCES " + schemaName + ".users(id))");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".wiki_docs (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "tenant_id VARCHAR(50) NOT NULL, " +
                    "title VARCHAR(200) NOT NULL, " +
                    "content CLOB, " +
                    "updated_by VARCHAR(100), " +
                    "updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".devops_commits (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "tenant_id VARCHAR(50) NOT NULL, " +
                    "repo_name VARCHAR(100) NOT NULL, " +
                    "author VARCHAR(100), " +
                    "hash VARCHAR(20) NOT NULL, " +
                    "message TEXT NOT NULL, " +
                    "task_id VARCHAR(50), " +
                    "timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                stmt.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".devops_repos (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "tenant_id VARCHAR(50) NOT NULL, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "lang VARCHAR(50), " +
                    "desc VARCHAR(1000), " +
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");

                connection.commit();
                log.info("Successfully initialized schema and tables for tenant: {}", schemaName);
            } catch (Exception e) {
                connection.rollback();
                log.error("Failed to initialize schema for tenant: " + schemaName, e);
                throw new RuntimeException("Failed to initialize tenant database schema", e);
            }
        } catch (SQLException e) {
            log.error("Failed to obtain database connection for tenant schema creation", e);
            throw new RuntimeException("Failed to obtain database connection", e);
        }
    }

    public void saveAdminUser(String tenantId, String userId, String email, String encodedPassword, String name) {
        saveTenantUser(tenantId, userId, email, encodedPassword, name, "COMPANY_ADMIN");
    }

    public void saveTenantUser(String tenantId, String userId, String email, String encodedPassword, String name, String role) {
        String sanitizedTenant = tenantId.replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
        String schemaName = "tenant_" + sanitizedTenant;

        String sql = "INSERT INTO " + schemaName + ".users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection connection = dataSource.getConnection();
             PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, userId);
            ps.setString(2, email);
            ps.setString(3, encodedPassword);
            ps.setString(4, name);
            ps.setString(5, role);
            ps.setTimestamp(6, Timestamp.valueOf(LocalDateTime.now()));
            ps.executeUpdate();
            log.info("User inserted via JDBC into schema {} with role {}", schemaName, role);
        } catch (SQLException e) {
            log.error("Failed to insert user into schema: " + schemaName, e);
            throw new RuntimeException("Failed to save tenant user", e);
        }
    }

    public String[] findUserByEmail(String tenantId, String email) {
        String sanitizedTenant = tenantId.replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
        String schemaName = "tenant_" + sanitizedTenant;
        String sql = "SELECT id, email, password, name, role FROM " + schemaName + ".users WHERE email = ?";

        try (Connection connection = dataSource.getConnection();
             PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, email);
            var rs = ps.executeQuery();
            if (rs.next()) {
                return new String[]{
                    rs.getString("id"),
                    rs.getString("email"),
                    rs.getString("password"),
                    rs.getString("name"),
                    rs.getString("role")
                };
            }
            return null;
        } catch (SQLException e) {
            log.error("Failed to find user by email in schema: " + schemaName, e);
            throw new RuntimeException("Failed to find user", e);
        }
    }
}
