/**
 * FeatureFlagsPage - Admin UI for Feature Flags, Experiments, and Feedback
 *
 * Allows super_admin users to:
 * - Manage feature flags (create, edit, enable/disable)
 * - Create and manage A/B experiments
 * - View and respond to user feedback
 * - Create and manage in-app announcements
 */

import { useAuth } from '../contexts/AuthContext';


import {
  Flag,
  FlaskConical,
  MessageSquare,
  Megaphone,
  Bug,
} from 'lucide-react';
import { useFeatureFlags } from './hooks/useFeatureFlags.js';



const tabs = [
  { id: 'flags', label: 'Feature Flags', icon: Flag },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'debug', label: 'Debug', icon: Bug },
];

export default function FeatureFlagsPage() {
  const { userProfile } = useAuth();
  const {
    activeTab,
    setActiveTab,
    flags,
    experiments,
    feedback,
    announcements,
    loading,
    error,
    clearError,
    showFlagModal,
    setShowFlagModal,
    showExperimentModal,
    setShowExperimentModal,
    showAnnouncementModal,
    setShowAnnouncementModal,
    editingItem,
    setEditingItem,
    handleRefresh,
    handleToggleFlag,
    handleDeleteFlag,
    handleUpdateExperimentStatus,
    handleDeleteExperiment,
    handleUpdateFeedbackStatus,
    handleToggleAnnouncement,
    handleDeleteAnnouncement,
  } = useFeatureFlags();

  // Check if user is super_admin
  if (userProfile?.role !== 'super_admin') {
    return (
      <PageLayout>
        <PageHeader title="Feature Flags" />
        <PageContent>
          <Alert variant="error" title="Access Denied">
            You do not have permission to access this page.
          </Alert>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="wide">
      <PageHeader
        title="Feature Flags & Experiments"
        description="Control feature rollouts, A/B tests, and in-app communications"
      />
      <PageContent>
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-all duration-100
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <Alert variant="error" dismissible onDismiss={clearError} className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'flags' && (
              <FeatureFlagsTab
                flags={flags}
                onRefresh={handleRefresh}
                onToggle={handleToggleFlag}
                onDelete={handleDeleteFlag}
                onEdit={(flag) => {
                  setEditingItem(flag);
                  setShowFlagModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowFlagModal(true);
                }}
              />
            )}
            {activeTab === 'experiments' && (
              <ExperimentsTab
                experiments={experiments}
                onRefresh={handleRefresh}
                onStatusChange={handleUpdateExperimentStatus}
                onDelete={handleDeleteExperiment}
                onEdit={(exp) => {
                  setEditingItem(exp);
                  setShowExperimentModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowExperimentModal(true);
                }}
              />
            )}
            {activeTab === 'feedback' && (
              <FeedbackTab
                feedback={feedback}
                onRefresh={handleRefresh}
                onStatusChange={handleUpdateFeedbackStatus}
              />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsTab
                announcements={announcements}
                onRefresh={handleRefresh}
                onToggle={handleToggleAnnouncement}
                onDelete={handleDeleteAnnouncement}
                onEdit={(ann) => {
                  setEditingItem(ann);
                  setShowAnnouncementModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowAnnouncementModal(true);
                }}
              />
            )}
            {activeTab === 'debug' && <FeatureFlagsDebug />}
          </>
        )}

        {/* Feature Flag Modal */}
        <FlagModal
          open={showFlagModal}
          onClose={() => setShowFlagModal(false)}
          flag={editingItem}
          onSave={handleRefresh}
        />

        {/* Experiment Modal */}
        <ExperimentModal
          open={showExperimentModal}
          onClose={() => setShowExperimentModal(false)}
          experiment={editingItem}
          onSave={handleRefresh}
        />

        {/* Announcement Modal */}
        <AnnouncementModal
          open={showAnnouncementModal}
          onClose={() => setShowAnnouncementModal(false)}
          announcement={editingItem}
          onSave={handleRefresh}
        />
      </PageContent>
    </PageLayout>
  );
}
