package com.saas.pm.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "devops_commits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevOpsCommit {

    @Id
    private String id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "repo_name", nullable = false)
    private String repoName;

    @Column(name = "task_id")
    private String taskId; // Linked Task UUID

    private String author;

    private String hash;

    @Column(columnDefinition = "TEXT")
    private String message;

    private LocalDateTime timestamp;
}
