package com.saas.pm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PlanLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handlePlanLimitExceeded(PlanLimitExceededException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Plan Limit Exceeded");
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(TaskBlockedException.class)
    public ResponseEntity<Map<String, String>> handleTaskBlocked(TaskBlockedException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Task Blocked");
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}
