package com.saas.pm.config;

import com.saas.pm.repository.TenantRepository;
import com.saas.pm.service.TenantSchemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Optional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final TenantSchemaService tenantSchemaService;
    private final TenantRepository tenantRepository;

    @Autowired
    public UserDetailsServiceImpl(TenantSchemaService tenantSchemaService, TenantRepository tenantRepository) {
        this.tenantSchemaService = tenantSchemaService;
        this.tenantRepository = tenantRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Resolve tenant ID from current context
        String tenantIdentifier = TenantContext.getCurrentTenant();

        // Resolve subdomain -> tenantId if needed
        String tenantId = tenantIdentifier;
        if (!tenantIdentifier.contains("-")) {
            // It's a subdomain, not a UUID — look up the tenant ID
            tenantId = tenantRepository.findBySubdomain(tenantIdentifier)
                    .map(t -> t.getId())
                    .orElse(tenantIdentifier);
        }

        // Use JDBC directly to bypass Hibernate's broken schema switching
        String[] userData = tenantSchemaService.findUserByEmail(tenantId, email);
        if (userData == null) {
            throw new UsernameNotFoundException("User not found with email: " + email);
        }

        // userData = [id, email, password, name, role]
        return new User(
                userData[1], // email
                userData[2], // encoded password
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + userData[4]))
        );
    }
}
