package com.saas.pm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@Slf4j
public class EmailService {

    private static final String SERVICE_ID = "service_sisc5vb";
    private static final String TEMPLATE_ID = "template_36j9lnm";
    private static final String PUBLIC_KEY = "FXBdpO4pwdqoXbh7F";

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.emailjs.com/api/v1.0")
            .build();

    /**
     * Sends an invite email via EmailJS.
     * 'to' = recipient email, 'subject' unused (fixed in template), 
     * 'body' is repurposed here as the invite link text.
     */
    public void sendEmail(String to, String subject, String body) {
        log.info("📤 Sending email via EmailJS to: {}", to);

        try {
            webClient.post()
                    .uri("/email/send")
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of(
                            "service_id", SERVICE_ID,
                            "template_id", TEMPLATE_ID,
                            "user_id", PUBLIC_KEY,
                            "template_params", Map.of(
                                    "email", to,
                                    "to_name", to,
                                    "invite_link", body
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity()
                    .block();

            log.info("✅ Email sent successfully to: {}", to);

        } catch (Exception e) {
            log.error("❌ Failed to send email to {}: {}", to, e.getMessage());
            printToConsole(to, subject, body);
        }
    }

    private void printToConsole(String to, String subject, String body) {
        System.out.println("====================================================================");
        System.out.println("📬 EMAIL LOG (send failed — invite details below)");
        System.out.println("To:      " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body:");
        System.out.println(body);
        System.out.println("====================================================================");
    }
}
