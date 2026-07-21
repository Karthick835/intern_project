package com.saas.pm.dto;

import lombok.Data;

@Data
public class InviteRequest {
    private String email;
    private String name;
    private String role; // COMPANY_ADMIN, PROJECT_MANAGER, DEVELOPER
}
