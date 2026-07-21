package com.saas.pm.service;

import com.saas.pm.model.User;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.saas.pm.config.TenantContext;
import com.saas.pm.config.PlanLimits;
import com.saas.pm.model.Tenant;
import com.saas.pm.repository.TenantRepository;
import com.saas.pm.exception.PlanLimitExceededException;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(String email, String password, String name, String role) {
        log.info("Creating user: {}", email);
        
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null && !tenantId.equalsIgnoreCase("public") && !tenantId.equalsIgnoreCase("default")) {
            Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
            if (tenant != null) {
                PlanLimits.LimitDetails limits = PlanLimits.getLimits(tenant.getPlan());
                long memberCount = userRepository.count();
                if (memberCount >= limits.maxMembers) {
                    throw new PlanLimitExceededException("Your plan (" + tenant.getPlan() + ") limit of " + limits.maxMembers + " members has been reached. Please upgrade your plan to invite more members.");
                }
            }
        }
        
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }
        
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(email)
                .password(passwordEncoder.encode(password))
                .name(name)
                .role(role)
                .build();
        
        return userRepository.save(user);
    }

    public Optional<User> getUserByEmail(String email) {
        log.info("Fetching user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    public Optional<User> getUser(String userId) {
        log.info("Fetching user: {}", userId);
        return userRepository.findById(userId);
    }

    public List<User> getAllUsers() {
        log.info("Fetching all users");
        return userRepository.findAll();
    }

    public User updateUser(String userId, String name, String role) {
        log.info("Updating user: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        if (name != null) user.setName(name);
        if (role != null) user.setRole(role);
        
        return userRepository.save(user);
    }

    public void deleteUser(String userId) {
        log.info("Deleting user: {}", userId);
        userRepository.deleteById(userId);
    }

    public List<User> getUsersByRole(String role) {
        log.info("Fetching users with role: {}", role);
        return userRepository.findByRole(role);
    }
}
