package com.saas.pm.config;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class MultiTenantConnectionProviderImpl implements MultiTenantConnectionProvider {

    private final DataSource dataSource;

    @Autowired
    public MultiTenantConnectionProviderImpl(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(Object tenantIdentifier) throws SQLException {
        Connection connection = getAnyConnection();
        try {
            String tenantStr = tenantIdentifier != null ? tenantIdentifier.toString() : "PUBLIC";
            String sanitizedTenant = tenantStr.replaceAll("[^a-zA-Z0-9_]", "");
            try (Statement stmt = connection.createStatement()) {
                if (sanitizedTenant.equalsIgnoreCase("public") || sanitizedTenant.equalsIgnoreCase("default")) {
                    // Ensure PUBLIC schema exists and switch to it
                    stmt.execute("CREATE SCHEMA IF NOT EXISTS PUBLIC");
                    stmt.execute("SET SCHEMA PUBLIC");
                } else {
                    // Create tenant schema if it doesn't exist, then switch
                    String schemaName = "tenant_" + sanitizedTenant;
                    stmt.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
                    stmt.execute("SET SCHEMA " + schemaName);
                }
            }
        } catch (SQLException e) {
            connection.close();
            throw e;
        }
        return connection;
    }

    @Override
    public void releaseConnection(Object tenantIdentifier, Connection connection) throws SQLException {
        try {
            try (Statement stmt = connection.createStatement()) {
                stmt.execute("CREATE SCHEMA IF NOT EXISTS PUBLIC");
                stmt.execute("SET SCHEMA PUBLIC");
            }
        } catch (SQLException e) {
            // Ignore reset failures
        }
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }
}
