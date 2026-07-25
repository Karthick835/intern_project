package com.saas.pm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@Slf4j
public class EmailService {

    @Value("${resend.api.key:}")
    private String resendApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.resend.com")
            .build();

    public void sendEmail(String to, String subject, String body) {
        log.info("📤 Sending email via Resend to: {}", to);

        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.error("❌ Resend API key not configured!");
            printToConsole(to, subject, body);
            return;
        }

        try {
            String htmlBody = buildHtmlEmail(subject, body);

            webClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of(
                            "from", "SaaS Grid <onboarding@resend.dev>",
                            "to", to,
                            "subject", subject,
                            "html", htmlBody
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

    private String buildHtmlEmail(String subject, String textBody) {
        String htmlContent = textBody
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\r\n", "<br>")
                .replace("\n", "<br>");

        htmlContent = htmlContent.replaceAll(
                "(http[s]?://[\\w.:/\\-?=&]+)",
                "<div style=\"margin: 24px 0;\">"
              + "  <a href=\"$1\" style=\"display: inline-block; background: #6366f1; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none;\">Accept Invitation</a>"
              + "</div>"
              + "<p style=\"font-size: 12px; color: #6b7280; margin-top: 16px;\">"
              + "  If the button doesn't work, copy and paste this URL into your browser:<br>"
              + "  <code style=\"background: #f3f4f6; padding: 6px 10px; border-radius: 6px; word-break: break-all; display: block; margin-top: 6px;\">$1</code>"
              + "</p>"
        );

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
             + "<style>body{font-family:Arial,sans-serif;background:#f0f4f8;}"
             + ".wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;}"
             + ".header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px;text-align:center;}"
             + ".header h1{color:#fff;margin:0;}"
             + ".body{padding:36px;color:#374151;font-size:15px;line-height:1.8;}"
             + "</style></head><body>"
             + "<div class='wrapper'><div class='header'><h1>⚡ SaaS Grid</h1></div>"
             + "<div class='body'>" + htmlContent + "</div></div>"
             + "</body></html>";
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
