package com.saas.pm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Autowired(required = false)
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends a real HTML email via Gmail SMTP using the configured App Password.
     */
    public void sendEmail(String to, String subject, String body) {
        log.info("📤 Sending email via Gmail SMTP to: {}", to);

        if (mailSender == null) {
            log.error("❌ JavaMailSender is not configured!");
            printToConsole(to, subject, body);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);

            // Send a beautiful HTML version
            String htmlBody = buildHtmlEmail(subject, body);
            helper.setText(body, htmlBody); // plain text fallback + HTML

            mailSender.send(message);
            log.info("✅ Email sent successfully to: {}", to);

        } catch (Exception e) {
            log.error("❌ Failed to send email to {}: {}", to, e.getMessage());
            printToConsole(to, subject, body);
        }
    }

    // ── HTML email template ────────────────────────────────────────────────────

    private String buildHtmlEmail(String subject, String textBody) {
        String htmlContent = textBody
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\r\n", "<br>")
                .replace("\n", "<br>");

        // Make invite link clickable with action button + copy-paste raw link fallback
        htmlContent = htmlContent.replaceAll(
                "(http[s]?://[\\w.:/\\-?=&]+)",
                "<div style=\"margin: 24px 0;\">"
              + "  <a href=\"$1\" style=\"display: inline-block; background: #6366f1; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);\">Accept Invitation</a>"
              + "</div>"
              + "<p style=\"font-size: 12px; color: #6b7280; margin-top: 16px;\">"
              + "  If the button doesn't work, copy and paste this URL into your mobile browser:<br>"
              + "  <code style=\"background: #f3f4f6; color: #1f2937; padding: 6px 10px; border-radius: 6px; word-break: break-all; display: block; margin-top: 6px; font-family: monospace; font-size: 11px;\">$1</code>"
              + "</p>"
        );

        return "<!DOCTYPE html>"
             + "<html><head><meta charset='UTF-8'>"
             + "<style>"
             + "  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;}"
             + "  .wrapper{max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;"
             + "           box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;}"
             + "  .header{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;}"
             + "  .header h1{color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;}"
             + "  .header p{color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;}"
             + "  .body{padding:36px 40px;color:#374151;font-size:15px;line-height:1.8;}"
             + "  .footer{background:#f9fafb;padding:20px 40px;text-align:center;color:#9ca3af;font-size:12px;"
             + "           border-top:1px solid #e5e7eb;}"
             + "</style></head><body>"
             + "<div class='wrapper'>"
             + "  <div class='header'>"
             + "    <h1>⚡ SaaS Grid</h1>"
             + "    <p>Project Management Platform</p>"
             + "  </div>"
             + "  <div class='body'>"
             + "    <p>" + htmlContent + "</p>"
             + "  </div>"
             + "  <div class='footer'>"
             + "    <p>This email was sent by SaaS Grid &bull; You received this because you were invited to a workspace.</p>"
             + "  </div>"
             + "</div>"
             + "</body></html>";
    }

    // ── Console fallback ───────────────────────────────────────────────────────

    private void printToConsole(String to, String subject, String body) {
        System.out.println("====================================================================");
        System.out.println("📬 EMAIL LOG (SMTP failed — invite details below)");
        System.out.println("To:      " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body:");
        System.out.println(body);
        System.out.println("====================================================================");
    }
}
