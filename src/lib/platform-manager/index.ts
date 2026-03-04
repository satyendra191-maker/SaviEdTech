/**
 * AI Autonomous Platform Manager
 * 
 * Comprehensive monitoring and alerting infrastructure for the SaviEdTech platform.
 * 
 * @module platform-manager
 */

// Monitor exports
export {
    // Core monitoring functions
    getRecentErrors,
    getErrorsByType,
    getSystemHealth,
    getLatestHealthStatus,
    getCronStatus,
    getDatabaseMetrics,
    logError,
    recordHealthCheck,
    getErrorSummary,

    // Types
    type ErrorLog,
    type SystemHealth,
    type CronJobStatus,
    type DatabaseMetrics,
    type MonitoringConfig,
    type HealthStatus,
} from './monitor';

// Alerts exports
export {
    // Alert management
    checkAlertConditions,
    sendAlert,
    getActiveAlerts,
    getAllAlerts,
    acknowledgeAlert,
    resolveAlert,

    // Alert rule management
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    getAlertRules,
    clearAllAlerts,

    // Types
    type Alert,
    type AlertSeverity,
    type AlertStatus,
    type AlertRule,
    type AlertCondition,
    type AlertConditionType,
    type NotificationChannel,
} from './alerts';

// Health checker exports
export {
    // Health check functions
    checkAPIHealth,
    checkDatabaseHealth,
    checkAuthHealth,
    checkCronHealth,
    runFullHealthCheck,
    checkServiceHealth,
    getHealthCheckHistory,
    scheduleHealthChecks,

    // Types
    type HealthCheckResult,
    type FullHealthReport,
} from './health';

// Security watchdog exports
export {
    // RLS Policy Auditor
    auditRLSPolicies,
    getTablesWithoutRLS,
    validatePolicyEffectiveness,

    // Authentication Monitor
    monitorAuthEvents,
    recordAuthEvent,
    detectBruteForce,
    blockIP,
    getAuthStats,
    monitorPasswordResets,

    // Query Analyzer
    analyzeQueryPatterns,
    detectSQLInjection,
    getSuspiciousQueries,
    monitorAdminEscalation,
    logQuery,

    // Security Reporter
    calculateSecurityScore,
    getVulnerabilityList,
    getSecurityRecommendations,
    generateSecurityReport,

    // Types
    type SecuritySeverity,
    type RLSPolicyCheck,
    type RLSPolicy,
    type AuthEvent,
    type BruteForceAttempt,
    type AuthStatistics,
    type QueryPattern,
    type SQLInjectionAttempt,
    type SuspiciousQuery,
    type AdminEscalationAttempt,
    type Vulnerability,
    type SecurityRecommendation,
    type SecurityReport,
} from './security';

// Auto-Testing Engine exports
export {
    // Test suite functions
    testLoginFlow,
    testRegistration,
    testPasswordReset,
    testOAuthCallback,
    testCoursePages,
    testLecturePlayer,
    testPracticeQuestions,
    testMockTests,
    testDailyChallenge,
    testDonationPage,
    testPaymentGateways,
    testWebhookEndpoints,
    testAdminDashboard,
    testUserManagement,
    testContentPublishing,

    // Test runner functions
    runTests,
    getRecentTestResults,
    getTestResultsByRunId,
    getTestRunHistory,
    getTestStatistics,
    generateTestReport,

    // Types
    type TestResult,
    type TestRunSummary,
    type TestStatus,
    type TestCategory,
    type TestConfig,
} from './testing';

// Performance Optimization Engine exports
export {
    // Query Optimizer
    analyzeSlowQueries,
    recommendIndexes,
    analyzeTablePerformance,
    getQueryPerformanceReport,

    // Cache Manager
    getCacheStats,
    recommendCacheStrategies,
    analyzeCacheEfficiency,
    implementQueryCache,
    invalidateCache,
    getCacheSize,

    // Bundle Analyzer
    analyzeBundleSize,
    identifyUnusedCode,
    recommendCodeSplitting,
    getBundleReport,

    // API Optimizer
    analyzeAPIResponseTimes,
    recommendAPIOptimizations,
    getAPIPerformanceReport,

    // Auto-Optimization
    runAutoOptimization,
    generateOptimizationReport,
    getPerformanceScore,
    getPerformanceMetrics,

    // Types
    type PerformanceScore,
    type OptimizationPriority,
    type SlowQuery,
    type IndexRecommendation,
    type TablePerformance,
    type QueryPerformanceReport,
    type CacheStats,
    type CacheStrategy,
    type CacheEfficiency,
    type BundleAnalysis,
    type BundleFile,
    type DependencyInfo,
    type UnusedCodeInfo,
    type DuplicateCodeInfo,
    type CodeSplittingRecommendation,
    type BundleReport,
    type APIEndpointPerformance,
    type APIOptimizationRecommendation,
    type APIPerformanceReport,
    type OptimizationReport,
    type PerformanceMetrics,
} from './performance';

// Self-Healing System exports
export {
    // Failure Detector
    detectDeploymentFailure,
    detectServerCrash,
    detectBrokenBuild,
    detectDatabaseOutage,
    getSystemStatus,

    // Recovery Manager
    initiateRollback,
    restartServices,
    clearCache,
    reconnectDatabase,
    executeRecoveryPlan,

    // Health Recovery
    recoverFromErrors,
    restoreCronJobs,
    resetConnections,
    selfHeal,

    // Monitoring & Alerts
    startFailureMonitoring,
    stopFailureMonitoring,
    sendRecoveryAlert,
    logRecoveryAction,

    // Utilities
    getRecentRecoveryActions,
    getRecentRecoveryPlans,
    getActiveMonitoringSessions,

    // Types
    type RecoveryAction,
    type RecoveryActionType,
    type RecoveryStatus,
    type RecoveryPlan,
    type FailureDetection,
    type SystemStatus,
} from './selfhealing';

// Payment Monitoring System exports
export {
    // Payment Gateway Monitor
    monitorRazorpay,
    monitorStripe,
    monitorPayPal,
    checkGatewayHealth,
    getGatewayStatus,

    // Transaction Monitor
    monitorTransactions,
    detectFailedTransactions,
    detectSuspiciousPayments,
    getTransactionStats,
    retryFailedPayment,

    // Webhook Monitor
    validateWebhookEndpoints,
    monitorWebhookDelivery,
    getWebhookStatus,
    replayWebhook,

    // Payment Reporter
    generatePaymentReport,
    getRevenueMetrics,
    getDonationStats,
    alertOnPaymentIssues,

    // Types
    type PaymentGateway,
    type PaymentStatus,
    type WebhookStatus,
    type GatewayHealth,
    type Transaction,
    type TransactionStats,
    type WebhookEndpoint,
    type WebhookDelivery,
    type FailedTransaction,
    type SuspiciousPaymentPattern,
    type RevenueMetrics,
    type DonationStats,
    type PaymentReport,
} from './payments';