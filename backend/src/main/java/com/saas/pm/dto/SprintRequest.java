package com.saas.pm.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SprintRequest {
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // BACKLOG, ACTIVE, COMPLETED
    private String retrospective;
}
