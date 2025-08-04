const User = require('../models/User');
const Order = require('../models/Order');
const CustomerSession = require('../models/CustomerSession');
const ConsentRecord = require('../models/ConsentRecord');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const archiver = require('archiver');
const { Readable } = require('stream');

class GdprComplianceService {
  /**
   * Export all user data (GDPR Article 20 - Right to data portability)
   */
  static async exportUserData(tenantId, userId, format = 'json') {
    try {
      // Create audit log
      await AuditLog.createLog({
        tenantId,
        userId,
        action: 'data_export_requested',
        category: 'export',
        resourceType: 'user',
        resourceId: userId,
        details: { format },
        metadata: { requestedBy: userId }
      });

      // Collect all user data
      const userData = await this.collectUserData(tenantId, userId);
      
      // Format data based on requested format
      if (format === 'json') {
        return {
          format: 'json',
          data: JSON.stringify(userData, null, 2),
          filename: `user_data_${userId}_${Date.now()}.json`
        };
      } else if (format === 'csv') {
        return {
          format: 'csv',
          data: this.convertToCSV(userData),
          filename: `user_data_${userId}_${Date.now()}.csv`
        };
      } else if (format === 'zip') {
        return await this.createDataArchive(userData, userId);
      }
    } catch (error) {
      await AuditLog.createLog({
        tenantId,
        userId,
        action: 'data_export_failed',
        category: 'export',
        success: false,
        error: { message: error.message }
      });
      throw error;
    }
  }

  /**
   * Collect all user data from various collections
   */
  static async collectUserData(tenantId, userId) {
    const user = await User.findOne({ _id: userId, tenantId }).lean();
    if (!user) throw new Error('User not found');

    // Remove sensitive fields
    delete user.password;
    delete user.refreshToken;

    const data = {
      exportDate: new Date().toISOString(),
      user: user,
      orders: await Order.find({ tenantId, userId }).lean(),
      sessions: await CustomerSession.find({ tenantId, userId }).lean(),
      consents: await ConsentRecord.find({ tenantId, userId }).lean(),
      auditLogs: await AuditLog.find({ tenantId, userId })
        .select('-details.requestBody -details.responseBody')
        .lean()
    };

    return data;
  }

  /**
   * Delete user data (GDPR Article 17 - Right to erasure)
   */
  static async deleteUserData(tenantId, userId, reason, performedBy) {
    try {
      // Create audit log before deletion
      await AuditLog.createLog({
        tenantId,
        userId: performedBy,
        action: 'user_data_deletion_requested',
        category: 'data_deletion',
        resourceType: 'user',
        resourceId: userId,
        details: { reason, targetUserId: userId },
        risk: { level: 'high' }
      });

      const user = await User.findOne({ _id: userId, tenantId });
      if (!user) throw new Error('User not found');

      // Check if user can be deleted (no active orders, legal holds, etc.)
      const activeOrders = await Order.find({
        tenantId,
        userId,
        status: { $in: ['pending', 'preparing', 'ready'] }
      });

      if (activeOrders.length > 0) {
        throw new Error('Cannot delete user with active orders');
      }

      // Anonymize data instead of hard delete for audit trail
      const anonymizedData = {
        name: 'Deleted User',
        email: `deleted_${Date.now()}@anonymous.local`,
        phone: '0000000000',
        isActive: false,
        deletedAt: new Date(),
        deletionReason: reason,
        deletedBy: performedBy
      };

      // Update user record
      await User.updateOne(
        { _id: userId, tenantId },
        { $set: anonymizedData }
      );

      // Anonymize related data
      await this.anonymizeRelatedData(tenantId, userId);

      // Log successful deletion
      await AuditLog.createLog({
        tenantId,
        userId: performedBy,
        action: 'user_data_deleted',
        category: 'data_deletion',
        resourceType: 'user',
        resourceId: userId,
        details: { reason },
        success: true
      });

      return { success: true, message: 'User data anonymized successfully' };
    } catch (error) {
      await AuditLog.createLog({
        tenantId,
        userId: performedBy,
        action: 'user_data_deletion_failed',
        category: 'data_deletion',
        success: false,
        error: { message: error.message }
      });
      throw error;
    }
  }

  /**
   * Anonymize related data
   */
  static async anonymizeRelatedData(tenantId, userId) {
    // Anonymize orders
    await Order.updateMany(
      { tenantId, userId },
      {
        $set: {
          customerName: 'Anonymous',
          customerEmail: 'anonymous@deleted.local',
          customerPhone: '0000000000'
        }
      }
    );

    // Delete sessions
    await CustomerSession.deleteMany({ tenantId, userId });

    // Update consent records
    await ConsentRecord.updateMany(
      { tenantId, userId },
      {
        $set: {
          status: 'withdrawn',
          withdrawalDate: new Date(),
          withdrawalReason: 'User data deletion requested'
        }
      }
    );
  }

  /**
   * Update user consent
   */
  static async updateConsent(tenantId, userId, consentData) {
    try {
      const consent = await ConsentRecord.recordConsent({
        tenantId,
        userId,
        ...consentData,
        ipAddress: consentData.ipAddress || 'unknown',
        userAgent: consentData.userAgent || 'unknown'
      });

      await AuditLog.createLog({
        tenantId,
        userId,
        action: `consent_${consentData.status}`,
        category: 'consent_management',
        resourceType: 'consent',
        resourceId: consent._id,
        details: { consentType: consentData.consentType }
      });

      return consent;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user consents
   */
  static async getUserConsents(tenantId, userId) {
    const consents = await ConsentRecord.find({
      tenantId,
      userId,
      status: 'granted',
      withdrawalDate: null
    }).sort({ createdAt: -1 });

    return consents;
  }

  /**
   * Check data retention compliance
   */
  static async checkDataRetention(tenantId) {
    const DataRetentionPolicy = require('../models/DataRetentionPolicy');
    const policies = await DataRetentionPolicy.getActivePolicies(tenantId);
    const results = [];

    for (const policy of policies) {
      const result = await this.applyRetentionPolicy(tenantId, policy);
      results.push(result);
    }

    return results;
  }

  /**
   * Apply retention policy
   */
  static async applyRetentionPolicy(tenantId, policy) {
    const cutoffDate = policy.calculateRetentionEndDate(new Date());
    let affectedRecords = 0;

    switch (policy.dataType) {
      case 'order_history':
        if (policy.actionOnExpiry === 'delete') {
          const result = await Order.deleteMany({
            tenantId,
            createdAt: { $lt: cutoffDate },
            status: 'completed'
          });
          affectedRecords = result.deletedCount;
        } else if (policy.actionOnExpiry === 'anonymize') {
          const result = await Order.updateMany(
            {
              tenantId,
              createdAt: { $lt: cutoffDate },
              status: 'completed'
            },
            {
              $set: {
                customerName: 'Anonymous',
                customerEmail: 'anonymous@deleted.local',
                customerPhone: '0000000000'
              }
            }
          );
          affectedRecords = result.modifiedCount;
        }
        break;

      case 'session_data':
        const result = await CustomerSession.deleteMany({
          tenantId,
          createdAt: { $lt: cutoffDate },
          isActive: false
        });
        affectedRecords = result.deletedCount;
        break;

      // Add more data types as needed
    }

    // Update policy execution time
    policy.lastExecuted = new Date();
    policy.nextExecution = policy.calculateRetentionEndDate(new Date());
    await policy.save();

    // Log the action
    await AuditLog.createLog({
      tenantId,
      action: 'retention_policy_applied',
      category: 'compliance',
      resourceType: 'retention_policy',
      resourceId: policy._id,
      details: {
        policyType: policy.dataType,
        action: policy.actionOnExpiry,
        affectedRecords
      }
    });

    return {
      policyId: policy._id,
      dataType: policy.dataType,
      action: policy.actionOnExpiry,
      affectedRecords
    };
  }

  /**
   * Generate GDPR compliance report
   */
  static async generateComplianceReport(tenantId, startDate, endDate) {
    const report = {
      tenantId,
      generatedAt: new Date(),
      period: { startDate, endDate },
      metrics: {}
    };

    // Data subject requests
    const dataRequests = await AuditLog.countDocuments({
      tenantId,
      category: { $in: ['export', 'data_deletion', 'consent_management'] },
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Consent records
    const consentStats = await ConsentRecord.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Data breaches (if any)
    const securityIncidents = await AuditLog.countDocuments({
      tenantId,
      'risk.level': { $in: ['high', 'critical'] },
      category: 'security',
      timestamp: { $gte: startDate, $lte: endDate }
    });

    report.metrics = {
      dataSubjectRequests: dataRequests,
      consentStatistics: consentStats,
      securityIncidents: securityIncidents,
      retentionPoliciesApplied: await this.getRetentionPolicyMetrics(tenantId, startDate, endDate)
    };

    return report;
  }

  /**
   * Helper: Get retention policy metrics
   */
  static async getRetentionPolicyMetrics(tenantId, startDate, endDate) {
    const logs = await AuditLog.find({
      tenantId,
      action: 'retention_policy_applied',
      timestamp: { $gte: startDate, $lte: endDate }
    });

    let totalRecordsProcessed = 0;
    const byDataType = {};

    logs.forEach(log => {
      const dataType = log.details.policyType;
      const affected = log.details.affectedRecords || 0;
      
      totalRecordsProcessed += affected;
      
      if (!byDataType[dataType]) {
        byDataType[dataType] = 0;
      }
      byDataType[dataType] += affected;
    });

    return {
      totalRecordsProcessed,
      byDataType
    };
  }

  /**
   * Convert data to CSV format
   */
  static convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    const csvRows = [];
    
    // User data
    csvRows.push('USER DATA');
    csvRows.push('Field,Value');
    Object.entries(data.user).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        csvRows.push(`${key},"${value}"`);
      }
    });
    
    // Orders
    if (data.orders.length > 0) {
      csvRows.push('');
      csvRows.push('ORDER HISTORY');
      csvRows.push('Order ID,Date,Total,Status');
      data.orders.forEach(order => {
        csvRows.push(`${order._id},${order.createdAt},${order.total},${order.status}`);
      });
    }
    
    return csvRows.join('\n');
  }

  /**
   * Create ZIP archive of user data
   */
  static async createDataArchive(userData, userId) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];
      
      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          format: 'zip',
          data: buffer,
          filename: `user_data_${userId}_${Date.now()}.zip`
        });
      });
      archive.on('error', reject);
      
      // Add user data as JSON
      archive.append(JSON.stringify(userData.user, null, 2), { name: 'user_profile.json' });
      
      // Add orders
      if (userData.orders.length > 0) {
        archive.append(JSON.stringify(userData.orders, null, 2), { name: 'orders.json' });
      }
      
      // Add consent records
      if (userData.consents.length > 0) {
        archive.append(JSON.stringify(userData.consents, null, 2), { name: 'consents.json' });
      }
      
      archive.finalize();
    });
  }
}

module.exports = GdprComplianceService;