import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Globe,
  Smartphone,
  Tag,
  Eye,
  FileText,
  Code
} from 'lucide-react';
import { AuditLog, ReviewDecision } from '../../types/auditLog';
import { format } from 'date-fns';
import { auditLogAPI } from '../../services/auditLogAPI';

interface AuditLogDetailsProps {
  log: AuditLog;
  onClose: () => void;
  onReview?: (decision: ReviewDecision, notes?: string) => void;
  onMarkFalsePositive?: () => void;
  onAddTags?: (tags: string[]) => void;
}

const AuditLogDetails: React.FC<AuditLogDetailsProps> = ({
  log,
  onClose,
  onReview,
  onMarkFalsePositive,
  onAddTags
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'request' | 'changes' | 'context' | 'review'>('overview');
  const [reviewNotes, setReviewNotes] = useState('');
  const [newTag, setNewTag] = useState('');

  const getSeverityColor = (severity: string) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity as keyof typeof colors] || colors.info;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Audit Log Details</h2>
            <p className="text-sm text-gray-500">Event ID: {log.eventId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Alert Banner */}
        {(log.flags.suspicious || log.security.severity === 'critical') && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">
                This event has been flagged as suspicious and requires immediate review.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'request', label: 'Request Details' },
              { id: 'changes', label: 'Changes' },
              { id: 'context', label: 'Context' },
              { id: 'review', label: 'Review' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Summary */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Event Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Action</dt>
                      <dd className="text-sm font-medium text-gray-900">{log.action}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900">{log.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Timestamp</dt>
                      <dd className="text-sm text-gray-900">
                        {format(new Date(log.timestamp), 'PPpp')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="flex items-center text-sm">
                        {log.result.success ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            Failed
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Security Assessment</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Severity</dt>
                      <dd>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.security.severity)}`}>
                          {log.security.severity.toUpperCase()}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Risk Score</dt>
                      <dd className="text-sm text-gray-900">{log.security.riskScore}/100</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Flags</dt>
                      <dd className="flex items-center space-x-2">
                        {log.flags.suspicious && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            Suspicious
                          </span>
                        )}
                        {log.flags.requiresReview && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                            Requires Review
                          </span>
                        )}
                        {log.flags.reviewed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                            Reviewed
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Actor Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Actor Information</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{log.actor.name || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{log.actor.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Role</dt>
                    <dd className="text-sm text-gray-900">{log.actor.role || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">IP Address</dt>
                    <dd className="text-sm text-gray-900">{log.actor.ip || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Resource Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Resource Information</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">{log.resource.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">ID</dt>
                    <dd className="text-sm text-gray-900 font-mono">{log.resource.id || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{log.resource.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Path</dt>
                    <dd className="text-sm text-gray-900 font-mono">{log.resource.path || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'request' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Request Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Method</dt>
                    <dd className="text-sm font-mono text-gray-900">{log.request?.method || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Endpoint</dt>
                    <dd className="text-sm font-mono text-gray-900">{log.request?.endpoint || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Response Status</dt>
                    <dd className="text-sm text-gray-900">{log.request?.responseStatus || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Response Time</dt>
                    <dd className="text-sm text-gray-900">{log.request?.responseTime ? `${log.request.responseTime}ms` : '-'}</dd>
                  </div>
                </dl>
              </div>

              {log.request?.body && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Request Body</h3>
                  <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(log.request.body, null, 2)}
                  </pre>
                </div>
              )}

              {log.result.errorMessage && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Error Details</h3>
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-red-800">{log.result.errorMessage}</p>
                    {log.result.errorCode && (
                      <p className="text-xs text-red-600 mt-1">Error Code: {log.result.errorCode}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-6">
              {log.flags.reviewed ? (
                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-green-900 mb-2">Review Status</h3>
                  <p className="text-sm text-green-800">This event has been reviewed.</p>
                  {log.review && (
                    <dl className="mt-3 space-y-1">
                      <div>
                        <dt className="text-xs text-green-600">Reviewed By</dt>
                        <dd className="text-sm text-green-900">{log.review.reviewedBy}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-green-600">Decision</dt>
                        <dd className="text-sm text-green-900">{log.review.reviewDecision}</dd>
                      </div>
                      {log.review.reviewNotes && (
                        <div>
                          <dt className="text-xs text-green-600">Notes</dt>
                          <dd className="text-sm text-green-900">{log.review.reviewNotes}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Review This Event</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Notes
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Add your review notes..."
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => onReview?.('approved', reviewNotes)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReview?.('rejected', reviewNotes)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onReview?.('no_action_needed', reviewNotes)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                      >
                        No Action Needed
                      </button>
                      {log.flags.suspicious && (
                        <button
                          onClick={onMarkFalsePositive}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                        >
                          Mark False Positive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {log.tags?.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTag) {
                        onAddTags?.([newTag]);
                        setNewTag('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newTag) {
                        onAddTags?.([newTag]);
                        setNewTag('');
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetails;