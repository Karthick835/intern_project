package com.saas.pm.dto;

import lombok.Data;

@Data
public class TimeLogRequest {
    private String taskId;
    private Integer hoursSpent;
    private String notes;
}

