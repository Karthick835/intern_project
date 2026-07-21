package com.saas.pm.service;

import com.saas.pm.model.Sprint;
import com.saas.pm.model.Task;
import com.saas.pm.repository.SprintRepository;
import com.saas.pm.repository.TaskRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;

    @Autowired
    public SprintService(SprintRepository sprintRepository, TaskRepository taskRepository) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
    }

    public Sprint createSprint(String name, LocalDate startDate, LocalDate endDate, String status) {
        log.info("Creating sprint: {}", name);
        
        Sprint sprint = Sprint.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .startDate(startDate)
                .endDate(endDate)
                .status(status)
                .velocity(0)
                .build();
        
        return sprintRepository.save(sprint);
    }

    public Sprint updateSprint(String sprintId, Sprint sprintUpdate) {
        log.info("Updating sprint: {}", sprintId);
        
        Optional<Sprint> sprintOpt = sprintRepository.findById(sprintId);
        if (sprintOpt.isEmpty()) {
            throw new RuntimeException("Sprint not found");
        }
        
        Sprint sprint = sprintOpt.get();
        if (sprintUpdate.getName() != null) sprint.setName(sprintUpdate.getName());
        if (sprintUpdate.getStartDate() != null) sprint.setStartDate(sprintUpdate.getStartDate());
        if (sprintUpdate.getEndDate() != null) sprint.setEndDate(sprintUpdate.getEndDate());
        if (sprintUpdate.getStatus() != null) sprint.setStatus(sprintUpdate.getStatus());
        if (sprintUpdate.getRetrospective() != null) sprint.setRetrospective(sprintUpdate.getRetrospective());
        
        return sprintRepository.save(sprint);
    }

    public Optional<Sprint> getSprint(String sprintId) {
        log.info("Fetching sprint: {}", sprintId);
        return sprintRepository.findById(sprintId);
    }

    public List<Sprint> getAllSprints() {
        log.info("Fetching all sprints");
        return sprintRepository.findAll();
    }

    public List<Sprint> getSprintsByStatus(String status) {
        log.info("Fetching sprints with status: {}", status);
        return sprintRepository.findByStatus(status);
    }

    public Integer calculateVelocity(String sprintId) {
        log.info("Calculating velocity for sprint: {}", sprintId);
        
        List<Task> allSprintTasks = taskRepository.findBySprintId(sprintId);
        log.info("Debug: Total tasks in sprint {}: {}", sprintId, allSprintTasks.size());
        for (Task t : allSprintTasks) {
            log.info("Debug: Task ID: {}, Title: '{}', Status: '{}', Estimate: {}", 
                     t.getId(), t.getTitle(), t.getStatus(), t.getTimeEstimate());
        }

        List<Task> completedTasks = taskRepository.findBySprintIdAndStatus(sprintId, "DONE");
        int velocity = completedTasks.stream()
                .mapToInt(t -> t.getTimeEstimate() != null ? t.getTimeEstimate() : 0)
                .sum();
        
        log.info("Sprint {} velocity: {}", sprintId, velocity);
        return velocity;
    }

    public void deleteSprint(String sprintId) {
        log.info("Deleting sprint: {}", sprintId);
        sprintRepository.deleteById(sprintId);
    }
}
