package com.saas.pm.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "devops_repos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevOpsRepo {
    @Id
    private String id;
    
    @Column(name = "tenant_id", nullable = false)
    private String tenantId;
    
    @Column(nullable = false)
    private String name;
    
    private String lang;
    
    @Column(name = "description", length = 1000)
    private String desc;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
