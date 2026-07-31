package com.saas.pm.service;

import com.saas.pm.model.Task;
import com.saas.pm.repository.SprintRepository;
import com.saas.pm.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private SprintService sprintService;

    @Test
    void calculateVelocityCountsCompletedStatusesBeyondDone() {
        Task completedTask = Task.builder().id("1").status("DONE").timeEstimate(3).build();
        Task closedTask = Task.builder().id("2").status("COMPLETED").timeEstimate(4).build();
        Task archivedTask = Task.builder().id("3").status("CLOSED").timeEstimate(5).build();
        Task inProgressTask = Task.builder().id("4").status("IN_PROGRESS").timeEstimate(8).build();

        when(taskRepository.findBySprintId("sprint-1")).thenReturn(List.of(completedTask, closedTask, archivedTask, inProgressTask));

        Integer velocity = sprintService.calculateVelocity("sprint-1");

        assertEquals(12, velocity);
    }
}
