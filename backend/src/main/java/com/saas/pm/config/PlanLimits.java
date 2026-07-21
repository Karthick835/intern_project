package com.saas.pm.config;

import com.saas.pm.model.PlanType;
import java.util.HashMap;
import java.util.Map;

public class PlanLimits {
    public static class LimitDetails {
        public final int maxProjects;
        public final int maxMembers;
        public final int maxTasksPerProject;
        public final boolean analyticsUnlocked;
        public final boolean attachmentsUnlocked;
        public final boolean activityLogUnlocked;

        public LimitDetails(int maxProjects, int maxMembers, int maxTasksPerProject, 
                            boolean analyticsUnlocked, boolean attachmentsUnlocked, boolean activityLogUnlocked) {
            this.maxProjects = maxProjects;
            this.maxMembers = maxMembers;
            this.maxTasksPerProject = maxTasksPerProject;
            this.analyticsUnlocked = analyticsUnlocked;
            this.attachmentsUnlocked = attachmentsUnlocked;
            this.activityLogUnlocked = activityLogUnlocked;
        }
    }

    private static final Map<PlanType, LimitDetails> LIMITS = new HashMap<>();

    static {
        LIMITS.put(PlanType.FREE, new LimitDetails(
                3,       // maxProjects
                5,       // maxMembers
                20,      // maxTasksPerProject
                false,   // analyticsUnlocked
                false,   // attachmentsUnlocked
                false    // activityLogUnlocked
        ));

        LIMITS.put(PlanType.PRO, new LimitDetails(
                15,      // maxProjects
                20,      // maxMembers
                200,     // maxTasksPerProject
                true,    // analyticsUnlocked
                true,    // attachmentsUnlocked
                false    // activityLogUnlocked
        ));

        LIMITS.put(PlanType.ENTERPRISE, new LimitDetails(
                Integer.MAX_VALUE, // maxProjects
                Integer.MAX_VALUE, // maxMembers
                Integer.MAX_VALUE, // maxTasksPerProject
                true,              // analyticsUnlocked
                true,              // attachmentsUnlocked
                true               // activityLogUnlocked
        ));
    }

    public static LimitDetails getLimits(String planName) {
        // Always return Enterprise limits to enable all features for all workspaces
        return LIMITS.get(PlanType.ENTERPRISE);
    }
}
