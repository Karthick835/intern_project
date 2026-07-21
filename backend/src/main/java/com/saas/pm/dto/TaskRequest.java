package com.saas.pm.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class TaskRequest {
    private String title;
    private String description;
    private String priority; // HIGH, MEDIUM, LOW
    private String type; // BUG, FEATURE, IMPROVEMENT
    private String status; // TO_DO, IN_PROGRESS, IN_REVIEW, DONE
    private String assigneeId;
    private LocalDate dueDate;
    private Integer timeEstimate; // in hours
    private String sprintId;
    private String projectId;
    private String blockedById;
}
