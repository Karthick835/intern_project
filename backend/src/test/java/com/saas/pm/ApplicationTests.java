package com.saas.pm;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("default") // Runs with the H2 in-memory profile
class ApplicationTests {

    @Test
    void contextLoads() {
    }
}
