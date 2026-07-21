package com.saas.pm.controller;

import com.saas.pm.config.TenantContext;
import com.saas.pm.model.PaymentTransaction;
import com.saas.pm.model.Tenant;
import com.saas.pm.repository.PaymentTransactionRepository;
import com.saas.pm.repository.TenantRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
@CrossOrigin
@Slf4j
public class BillingController {

    private final TenantRepository tenantRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret}")
    private String stripeWebhookSecret;

    @Autowired
    public BillingController(TenantRepository tenantRepository,
                             PaymentTransactionRepository paymentTransactionRepository) {
        this.tenantRepository = tenantRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession() {
        String tenantId = TenantContext.getCurrentTenant();
        log.info("Creating Stripe Checkout Session for tenant ID: {}", tenantId);

        if (tenantId == null || tenantId.equalsIgnoreCase("public") || tenantId.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("No active tenant context");
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.notFound().build();
        }

        if (stripeSecretKey == null || stripeSecretKey.isEmpty() || stripeSecretKey.contains("dummy")) {
            log.warn("Stripe Secret Key is dummy or missing. Falling back to checkout simulation mode.");
            Map<String, String> response = new HashMap<>();
            String sessionId = "mock_session_" + UUID.randomUUID().toString();
            response.put("url", "http://localhost:8888/billing/success?session_id=" + sessionId + "&mock_upgrade=true");
            return ResponseEntity.ok(response);
        }

        Stripe.apiKey = stripeSecretKey;

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl("http://localhost:8888/billing/success?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl("http://localhost:8888/billing/cancel")
                    .setClientReferenceId(tenantId)
                    .putMetadata("tenantId", tenantId)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("usd")
                                    .setUnitAmount(9900L) // $99.00 USD
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("SaaSGrid Enterprise Plan")
                                            .setDescription("Unlimited projects, members, and tasks + premium features")
                                            .build())
                                    .build())
                            .build())
                    .build();

            Session session = Session.create(params);

            Map<String, String> response = new HashMap<>();
            response.put("url", session.getUrl());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to create Stripe checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to initiate Stripe payment session: " + e.getMessage());
        }
    }

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> handleStripeWebhook(@RequestBody String payload,
                                                 @RequestHeader("Stripe-Signature") String sigHeader) {
        log.info("Received Stripe Webhook callback event");

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Stripe signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Signature verification failed");
        }

        log.info("Stripe Webhook event type: {}", event.getType());

        if ("checkout.session.completed".equals(event.getType())) {
            EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
            if (dataObjectDeserializer.getObject().isPresent()) {
                Session session = (Session) dataObjectDeserializer.getObject().get();
                String tenantId = session.getMetadata() != null ? session.getMetadata().get("tenantId") : null;
                if (tenantId == null) {
                    tenantId = session.getClientReferenceId();
                }

                if (tenantId != null) {
                    log.info("Processing successful payment checkout for tenant: {}", tenantId);
                    Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
                    if (tenant != null) {
                        tenant.setPlan("ENTERPRISE");
                        tenantRepository.save(tenant);

                        // Save PaymentTransaction
                        BigDecimal amount = BigDecimal.valueOf(session.getAmountTotal() != null ? session.getAmountTotal() : 0L)
                                .divide(BigDecimal.valueOf(100)); // Convert cents to dollars

                        PaymentTransaction transaction = PaymentTransaction.builder()
                                .id(UUID.randomUUID().toString())
                                .tenantId(tenantId)
                                .amount(amount)
                                .stripeSessionId(session.getId())
                                .status("COMPLETED")
                                .timestamp(LocalDateTime.now())
                                .build();

                        paymentTransactionRepository.save(transaction);
                        log.info("Tenant {} successfully upgraded to ENTERPRISE plan", tenantId);
                    } else {
                        log.error("Tenant ID {} parsed from metadata could not be found in DB", tenantId);
                    }
                } else {
                    log.error("No tenantId metadata or clientReferenceId found in webhook session payload");
                }
            }
        }

        return ResponseEntity.ok("Webhook processed");
    }

    @PostMapping("/mock-confirm")
    @Transactional
    public ResponseEntity<?> mockConfirmPayment() {
        String tenantId = TenantContext.getCurrentTenant();
        log.info("Simulated payment confirmation received for tenant: {}", tenantId);

        if (tenantId == null || tenantId.equalsIgnoreCase("public") || tenantId.equalsIgnoreCase("default")) {
            return ResponseEntity.badRequest().body("No active tenant context");
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.notFound().build();
        }

        tenant.setPlan("ENTERPRISE");
        tenantRepository.save(tenant);

        // Save PaymentTransaction
        BigDecimal amount = BigDecimal.valueOf(99);

        PaymentTransaction transaction = PaymentTransaction.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .amount(amount)
                .stripeSessionId("mock_session_" + UUID.randomUUID().toString())
                .status("COMPLETED")
                .timestamp(LocalDateTime.now())
                .build();

        paymentTransactionRepository.save(transaction);
        log.info("Tenant {} successfully upgraded to ENTERPRISE plan (Simulated)", tenantId);

        return ResponseEntity.ok("Upgrade successful");
    }
}
