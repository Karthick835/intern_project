package com.saas.pm.dto;

import lombok.Data;

@Data
public class RegisterTenantRequest {
    private String companyName;
    private String subdomain;
    private String plan; // FREE, PRO, ENTERPRISE
    private String adminEmail;
    private String adminPassword;
    private String adminName;
}
