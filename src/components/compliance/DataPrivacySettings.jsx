/**
 * DataPrivacySettings - GDPR Data Export and Account Deletion UI
 */

import { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  Clock,
  FileJson,
  Shield,
  X,
} from 'lucide-react';
import { Button, Card } from '../../design-system';
import {
  requestDataExport,
  getLatestExportStatus,
  downloadClientSideExport,
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  DELETION_REASONS,
} from '../../services/gdprService';
import { withdrawConsent, getConsentHistory } from '../../services/consentService';

export default function DataPrivacySettings({ showToast, user }) {
  // Data Export State
  const [exportStatus, setExportStatus] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Account Deletion State
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    const [exportData, deletionData] = await Promise.all([
      getLatestExportStatus(),
      getDeletionStatus(),
    ]);
    setExportStatus(exportData);
    setDeletionStatus(deletionData);
  };

  // Data Export Handlers
  const handleQuickExport = async () => {
    setExportLoading(true);
    try {
      const result = await downloadClientSideExport();
      if (result.success) {
        showToast?.('Your data has been downloaded');
      } else {
        showToast?.(result.error || 'Failed to export data', 'error');
      }
    } catch (error) {
      showToast?.(error.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleFullExport = async () => {
    setExportLoading(true);
    try {
      const result = await requestDataExport('json');
      if (result.success) {
        showToast?.('Export requested. You\'ll receive an email when it\'s ready.');
        await loadStatuses();
      } else {
        showToast?.(result.error || 'Failed to request export', 'error');
      }
    } catch (error) {
      showToast?.(error.message || 'Export request failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Consent Withdrawal Handler
  const handleWithdrawConsent = async () => {
    if (!confirm('Are you sure you want to withdraw your cookie consent? This will reset your preferences.')) {
      return;
    }

    try {
      await withdrawConsent(user?.id);
      showToast?.('Cookie consent withdrawn. Your preferences have been reset.');
    } catch (error) {
      showToast?.(error.message || 'Failed to withdraw consent', 'error');
    }
  };

  // Account Deletion Handlers
  const handleRequestDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast?.('Please type DELETE to confirm', 'error');
      return;
    }

    setDeletionLoading(true);
    try {
      const result = await requestAccountDeletion({
        reason: deleteReason,
        feedback: deleteFeedback,
      });

      if (result.success) {
        showToast?.(`Account scheduled for deletion in ${result.daysRemaining} days`);
        setShowDeleteModal(false);
        await loadStatuses();
      } else {
        showToast?.(result.error || 'Failed to request deletion', 'error');
      }
    } catch (error) {
      showToast?.(error.message || 'Deletion request failed', 'error');
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!confirm('Are you sure you want to cancel your account deletion request?')) {
      return;
    }

    setDeletionLoading(true);
    try {
      const result = await cancelAccountDeletion();
      if (result.success) {
        showToast?.('Account deletion cancelled');
        await loadStatuses();
      } else {
        showToast?.(result.error || 'Failed to cancel deletion', 'error');
      }
    } catch (error) {
      showToast?.(error.message || 'Cancel failed', 'error');
    } finally {
      setDeletionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Export Your Data</h3>
            <p className="text-sm text-gray-600 mt-1">
              Download a copy of all your personal data. This includes your profile,
              settings, content, and activity history.
            </p>

            {exportStatus && exportStatus.status === 'processing' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Your export is being prepared. You'll receive an email when it's ready.
              </div>
            )}

            {exportStatus && exportStatus.status === 'completed' && exportStatus.file_url && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                <Check className="w-4 h-4" />
                <span>Your export is ready!</span>
                <a
                  href={exportStatus.file_url}
                  className="ml-auto text-green-700 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickExport}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                Quick Export (Basic Data)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullExport}
                disabled={exportLoading || exportStatus?.status === 'processing'}
              >
                <Download className="w-4 h-4" />
                Request Full Export
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Cookie Consent Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Cookie Preferences</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage your cookie consent and withdraw permissions at any time.
            </p>

            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdrawConsent}
              >
                Withdraw Cookie Consent
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Deletion Section */}
      <Card className="p-6 border-red-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Delete Account</h3>
            <p className="text-sm text-gray-600 mt-1">
              Permanently delete your account and all associated data. This action cannot be undone after the grace period.
            </p>

            {deletionStatus && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    Deletion scheduled for {new Date(deletionStatus.scheduled_deletion_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  {deletionStatus.days_remaining} days remaining. You can cancel this request if you change your mind.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelDeletion}
                  disabled={deletionLoading}
                  className="mt-2"
                >
                  {deletionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Cancel Deletion
                </Button>
              </div>
            )}

            {!deletionStatus && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <strong>Warning:</strong> Your account will be permanently deleted after a 30-day grace period.
                  During this time, you can cancel the deletion and restore your account.
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Why are you leaving? (optional)
                  </label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select a reason...</option>
                    {DELETION_REASONS.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Any feedback for us? (optional)
                  </label>
                  <textarea
                    value={deleteFeedback}
                    onChange={(e) => setDeleteFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Help us improve..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="DELETE"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteReason('');
                    setDeleteFeedback('');
                    setDeleteConfirmText('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestDeletion}
                  disabled={deleteConfirmText !== 'DELETE' || deletionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deletionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
