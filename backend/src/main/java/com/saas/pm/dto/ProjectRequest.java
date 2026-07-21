package com.saas.pm.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ProjectRequest {
    private String name;
    private String description;
    private String priority; // HIGH, MEDIUM, LOW
    private LocalDate deadline;
    private String status; // ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
}
