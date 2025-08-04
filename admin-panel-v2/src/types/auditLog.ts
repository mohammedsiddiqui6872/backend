// Audit Log Types for Enterprise Multi-Tenant System

export interface AuditLog {
  _id: string;
  tenantId: string;
  eventId: string;
  
  // Event Information
  action: AuditAction;
  category: AuditCategory;
  
  // Resource Information
  resource: {
    type: ResourceType;
    id?: string;
    name?: string;
    collection?: string;
    path?: string;
    parentType?: string;
    parentId?: string;
  };
  
  // Actor Information
  actor: {
    type: ActorType;
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    ip?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
    apiKeyId?: string;
    integrationName?: string;
  };
  
  // Request Details
  request?: {
    method?: string;
    endpoint?: string;
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, any>;
    files?: Array<{
      fieldname: string;
      originalname: string;
      mimetype: string;
      size: number;
    }>;
    responseStatus?: number;
    responseTime?: number;
    responseSize?: number;
    errorMessage?: string;
    errorStack?: string;
    errorCode?: string;
  };
  
  // Change Details
  changes?: Array<{
    field: string;
    fieldPath?: string;
    oldValue?: any;
    newValue?: any;
    oldValueType?: string;
    newValueType?: string;
    operation?: {
      type: 'set' | 'unset' | 'push' | 'pull' | 'increment' | 'decrement' | 'multiply';
    };
    arrayIndex?: number;
    isEncrypted?: boolean;
    isSensitive?: boolean;
  }>;
  
  // Additional Context
  context?: {
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    device?: string;
    deviceType?: string;
    location?: {
      country?: string;
      countryCode?: string;
      region?: string;
      city?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
      isp?: string;
      org?: string;
      as?: string;
    };
    referrer?: string;
    campaign?: string;
    source?: string;
    medium?: string;
    sessionDuration?: number;
    pageViews?: number;
    previousPage?: string;
  };
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Security & Risk Assessment
  security: {
    severity: SecuritySeverity;
    riskScore: number;
    riskFactors?: Array<{
      factor: string;
      weight: number;
      description: string;
    }>;
    anomalyScore?: number;
    isAnomaly?: boolean;
    threatIndicators?: string[];
    mitigationActions?: string[];
  };
  
  // Compliance & Legal
  compliance?: {
    isGdprRelated?: boolean;
    isPiiAccess?: boolean;
    isSensitiveOperation?: boolean;
    isFinancialData?: boolean;
    isHealthData?: boolean;
    regulations?: Array<{
      type: ComplianceRegulation;
      applicable: boolean;
      requirements?: string[];
    }>;
    dataClassification?: DataClassification;
    legalBasis?: string;
    purpose?: string;
    dataSubjects?: number;
    crossBorderTransfer?: boolean;
    thirdPartySharing?: boolean;
  };
  
  // Tags and Categorization
  tags?: string[];
  
  // Flags
  flags: {
    suspicious: boolean;
    reviewed: boolean;
    archived: boolean;
    requiresReview: boolean;
    falsePositive: boolean;
    incident: boolean;
    automated: boolean;
  };
  
  // Review and Investigation
  review?: {
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    reviewDecision?: ReviewDecision;
    escalatedTo?: string;
    escalatedAt?: Date;
    incidentId?: string;
  };
  
  // Relationships
  relationships?: {
    parentEventId?: string;
    childEventIds?: string[];
    relatedEventIds?: Array<{
      eventId: string;
      relationship: string;
      description?: string;
    }>;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    conversationId?: string;
  };
  
  // Performance Metrics
  performance?: {
    duration?: number;
    databaseQueries?: number;
    databaseTime?: number;
    cacheHits?: number;
    cacheMisses?: number;
    externalApiCalls?: number;
    externalApiTime?: number;
    memoryUsed?: number;
    cpuUsage?: number;
  };
  
  // Success/Failure Information
  result: {
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    errorCode?: string;
    errorStack?: string;
    retryCount?: number;
    failureReason?: string;
  };
  
  // Retention and Archival
  retention?: {
    policy?: string;
    retentionPeriod?: number;
    retentionDate?: Date;
    archivalStatus?: ArchivalStatus;
    archivalDate?: Date;
    deletionDate?: Date;
  };
  
  // Timestamps
  timestamp: Date;
  receivedAt?: Date;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Computed fields
  formattedTimestamp?: string;
  durationFormatted?: string;
}

// Enums and Types
export type AuditAction = 
  // Authentication & Authorization
  | 'auth.login' | 'auth.logout' | 'auth.login_failed' | 'auth.token_refresh' | 'auth.password_reset'
  | 'auth.2fa_enabled' | 'auth.2fa_disabled' | 'auth.2fa_verified' | 'auth.2fa_failed'
  | 'auth.session_expired' | 'auth.permission_denied' | 'auth.role_assigned' | 'auth.role_removed'
  // User Management
  | 'user.create' | 'user.update' | 'user.delete' | 'user.activate' | 'user.deactivate'
  | 'user.role_change' | 'user.permissions_change' | 'user.profile_update' | 'user.password_change'
  | 'user.email_verified' | 'user.phone_verified' | 'user.profile_photo_upload'
  // Data Operations
  | 'data.create' | 'data.read' | 'data.update' | 'data.delete' | 'data.export' | 'data.import'
  | 'data.bulk_create' | 'data.bulk_update' | 'data.bulk_delete' | 'data.archive' | 'data.restore'
  // System Operations
  | 'system.backup' | 'system.restore' | 'system.config_change' | 'system.maintenance'
  | 'system.integration_connect' | 'system.integration_disconnect' | 'system.health_check'
  | 'system.cache_clear' | 'system.restart' | 'system.update'
  // Security Events
  | 'security.access_denied' | 'security.suspicious_activity' | 'security.brute_force_attempt'
  | 'security.data_breach_attempt' | 'security.unauthorized_access' | 'security.ip_blocked'
  | 'security.api_key_generated' | 'security.api_key_revoked' | 'security.encryption_key_rotated'
  // Business Operations
  | 'order.create' | 'order.update' | 'order.cancel' | 'order.complete' | 'order.refund'
  | 'payment.process' | 'payment.refund' | 'payment.failed' | 'payment.method_added' | 'payment.method_removed'
  | 'table.assign' | 'table.release' | 'table.status_change' | 'table.combine' | 'table.split'
  | 'menu.create' | 'menu.update' | 'menu.delete' | 'menu.publish' | 'menu.unpublish'
  | 'inventory.update' | 'inventory.adjust' | 'inventory.transfer' | 'inventory.count'
  | 'shift.start' | 'shift.end' | 'shift.break_start' | 'shift.break_end' | 'shift.swap'
  // Compliance & Legal
  | 'compliance.gdpr_request' | 'compliance.data_export' | 'compliance.data_deletion'
  | 'compliance.consent_given' | 'compliance.consent_withdrawn' | 'compliance.audit_report'
  | 'compliance.terms_accepted' | 'compliance.privacy_policy_accepted'
  // API Operations
  | 'api.call' | 'api.rate_limit_exceeded' | 'api.key_created' | 'api.key_revoked'
  | 'api.webhook_sent' | 'api.webhook_failed' | 'api.integration_error'
  // Reporting & Analytics
  | 'report.generate' | 'report.export' | 'report.schedule' | 'report.email'
  | 'analytics.query' | 'analytics.export' | 'analytics.dashboard_view';

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'user_management'
  | 'data_access'
  | 'data_modification'
  | 'data_deletion'
  | 'system_operation'
  | 'security'
  | 'compliance'
  | 'business_operation'
  | 'api_operation'
  | 'reporting'
  | 'configuration'
  | 'integration';

export type ResourceType = 
  | 'user' | 'order' | 'table' | 'menu' | 'payment' | 'shift' 
  | 'report' | 'settings' | 'api' | 'system' | 'tenant' 
  | 'role' | 'permission' | 'audit_log';

export type ActorType = 
  | 'user' | 'system' | 'api' | 'integration' | 'anonymous' | 'scheduled_job';

export type SecuritySeverity = 
  | 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ComplianceRegulation = 
  | 'GDPR' | 'CCPA' | 'HIPAA' | 'PCI-DSS' | 'SOX' | 'ISO27001' | 'SOC2';

export type DataClassification = 
  | 'public' | 'internal' | 'confidential' | 'restricted';

export type ReviewDecision = 
  | 'approved' | 'rejected' | 'escalated' | 'no_action_needed';

export type ArchivalStatus = 
  | 'active' | 'archived' | 'deleted' | 'pending_deletion';

// Filter interfaces
export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  action?: AuditAction | AuditAction[];
  category?: AuditCategory | AuditCategory[];
  actorId?: string;
  actorEmail?: string;
  actorType?: ActorType;
  resourceType?: ResourceType;
  resourceId?: string;
  severity?: SecuritySeverity | SecuritySeverity[];
  minRiskScore?: number;
  suspicious?: boolean;
  requiresReview?: boolean;
  reviewed?: boolean;
  gdprOnly?: boolean;
  complianceRegulation?: ComplianceRegulation;
  tags?: string | string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeRedacted?: boolean;
}

// Statistics interfaces
export interface AuditLogStats {
  timeRange: {
    start: Date;
    end: Date;
  };
  stats: {
    overview: Array<{
      totalEvents: number;
      failedEvents: number;
      suspiciousEvents: number;
      avgResponseTime: number;
      avgRiskScore: number;
    }>;
    byAction: Array<{
      _id: string;
      count: number;
    }>;
    byCategory: Array<{
      _id: string;
      count: number;
    }>;
    bySeverity: Array<{
      _id: string;
      count: number;
    }>;
    byActor: Array<{
      _id: string;
      name: string;
      email: string;
      count: number;
      actions: string[];
    }>;
    byResource: Array<{
      _id: string;
      count: number;
    }>;
    timeline: Array<{
      _id: string;
      count: number;
      failures: number;
    }>;
    topErrors: Array<{
      _id: string;
      message: string;
      count: number;
    }>;
    riskDistribution: Array<{
      _id: string | number;
      count: number;
    }>;
  };
}

// User activity interface
export interface UserActivitySummary {
  userId: string;
  days: number;
  activity: Array<{
    _id: string;
    activities: Array<{
      action: string;
      count: number;
    }>;
    totalActions: number;
  }>;
}

// Compliance report interface
export interface ComplianceReport {
  regulation: ComplianceRegulation;
  timeRange: {
    start: Date;
    end: Date;
  };
  report: Array<{
    _id: string;
    count: number;
    actors: string[];
    resources: Array<{
      type: string;
      id: string;
    }>;
    dataSubjectsAffected: number;
  }>;
}

// Export format
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';

// Real-time event interfaces
export interface AuditNewEvent {
  eventId: string;
  action: AuditAction;
  actor: AuditLog['actor'];
  resource: AuditLog['resource'];
  severity: SecuritySeverity;
  timestamp: Date;
}

export interface AuditAlertEvent {
  eventId: string;
  message: string;
  severity: SecuritySeverity;
  actor: AuditLog['actor'];
  timestamp: Date;
}

export interface AuditReviewedEvent {
  eventId: string;
  reviewer: string;
  decision: ReviewDecision;
}