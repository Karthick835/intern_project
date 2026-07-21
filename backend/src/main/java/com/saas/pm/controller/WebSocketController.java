package com.saas.pm.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;

@Controller
@Slf4j
public class WebSocketController {

    @MessageMapping("/chat/{tenantId}")
    @SendTo("/topic/messages/{tenantId}")
    public Map<String, Object> handleChatMessage(
            @DestinationVariable String tenantId,
            @Payload Map<String, Object> payload) {
        log.info("WebSocket chat message received for tenant: {}", tenantId);
        
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("type", "CHAT");
        return payload;
    }
}
