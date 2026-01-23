import { useState } from 'react';
import {
  X,
  Monitor,
  Users,
  MapPin,
  Globe,
  ListMusic,
  Layout,
  Check,
  Loader2,
  Send,
  AlertCircle,
  Plus,
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { Button, Card } from '../../design-system';
import { formatPreviewLink, EXPIRY_PRESETS, getExpiryLabel } from '../../services/previewService';

/**
 * Request Approval Modal - for submitting campaigns for approval review
 */
export function ApprovalRequestModal({
  showApprovalModal,
  setShowApprovalModal,
  approvalMessage,
  setApprovalMessage,
  submittingApproval,
  handleSubmitForApproval,
}) {
  if (!showApprovalModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Request Approval</h2>
              <p className="text-sm text-gray-500">Submit for review</p>
            </div>
          </div>
          <button
            onClick={() => setShowApprovalModal(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (optional)
            </label>
            <textarea
              value={approvalMessage}
              onChange={(e) => setApprovalMessage(e.target.value)}
              placeholder="Add any notes for the reviewer..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700">
                This will change the campaign status to "In Review" and notify reviewers.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitForApproval} disabled={submittingApproval}>
            {submittingApproval ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Request Approval
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Preview Links Modal - for creating and managing preview links
 */
export function PreviewLinksModal({
  showPreviewModal,
  setShowPreviewModal,
  previewLinks,
  loadingPreviewLinks,
  creatingPreviewLink,
  selectedExpiry,
  setSelectedExpiry,
  allowComments,
  setAllowComments,
  copiedLinkId,
  handleCreatePreviewLink,
  handleRevokePreviewLink,
  handleCopyLink,
}) {
  if (!showPreviewModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Link2 size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Preview Links</h2>
              <p className="text-sm text-gray-500">Share this campaign for review</p>
            </div>
          </div>
          <button
            onClick={() => setShowPreviewModal(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create new link */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Create New Link</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires in
                </label>
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {Object.keys(EXPIRY_PRESETS).map((key) => (
                    <option key={key} value={key}>
                      {getExpiryLabel(key)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Allow comments</span>
                </label>
              </div>
            </div>
            <Button
              onClick={handleCreatePreviewLink}
              disabled={creatingPreviewLink}
              className="w-full"
            >
              {creatingPreviewLink ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} className="mr-2" />
                  Create Preview Link
                </>
              )}
            </Button>
          </div>

          {/* Existing links */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Active Links</h3>
            {loadingPreviewLinks ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading links...</p>
              </div>
            ) : previewLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No preview links yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previewLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded truncate max-w-[200px]">
                          {link.token}
                        </code>
                        {link.allow_comments && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <MessageSquare size={10} />
                            Comments
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Expires: {new Date(link.expires_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(link)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy link"
                      >
                        {copiedLinkId === link.id ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} className="text-gray-500" />
                        )}
                      </button>
                      <a
                        href={formatPreviewLink(link.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Open preview"
                      >
                        <ExternalLink size={16} className="text-gray-500" />
                      </a>
                      <button
                        onClick={() => handleRevokePreviewLink(link.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Target Picker Modal - for selecting screens, groups, or locations as campaign targets
 */
export function TargetPickerModal({ screens, screenGroups, locations, existingTargets, onSelect, onClose }) {
  const [tab, setTab] = useState('screens');

  const isTargetSelected = (type, id) => {
    return existingTargets.some(t =>
      t.target_type === type && (type === 'all' || t.target_id === id)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add Target</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'screens', label: 'Screens', icon: Monitor },
            { key: 'groups', label: 'Groups', icon: Users },
            { key: 'locations', label: 'Locations', icon: MapPin },
            { key: 'all', label: 'All Screens', icon: Globe }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'screens' && (
            <div className="space-y-2">
              {screens.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No screens available</p>
              ) : (
                screens.map(screen => (
                  <button
                    key={screen.id}
                    onClick={() => !isTargetSelected('screen', screen.id) && onSelect('screen', screen.id)}
                    disabled={isTargetSelected('screen', screen.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('screen', screen.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Monitor size={18} className="text-blue-600" />
                    <span className="font-medium">{screen.name}</span>
                    {isTargetSelected('screen', screen.id) && (
                      <span className="ml-auto text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'groups' && (
            <div className="space-y-2">
              {screenGroups.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No screen groups available</p>
              ) : (
                screenGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => !isTargetSelected('screen_group', group.id) && onSelect('screen_group', group.id)}
                    disabled={isTargetSelected('screen_group', group.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('screen_group', group.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Users size={18} className="text-purple-600" />
                    <div className="flex-1">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({group.screen_count || 0} screens)
                      </span>
                    </div>
                    {isTargetSelected('screen_group', group.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'locations' && (
            <div className="space-y-2">
              {locations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No locations available</p>
              ) : (
                locations.map(location => (
                  <button
                    key={location.id}
                    onClick={() => !isTargetSelected('location', location.id) && onSelect('location', location.id)}
                    disabled={isTargetSelected('location', location.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('location', location.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <MapPin size={18} className="text-green-600" />
                    <span className="font-medium">{location.name}</span>
                    {isTargetSelected('location', location.id) && (
                      <span className="ml-auto text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'all' && (
            <div className="text-center py-8">
              <Globe size={48} className="mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600 mb-4">
                Target all screens in your account
              </p>
              <Button
                onClick={() => !isTargetSelected('all', null) && onSelect('all', null)}
                disabled={isTargetSelected('all', null)}
              >
                {isTargetSelected('all', null) ? 'Already Added' : 'Add All Screens'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Content Picker Modal - for selecting playlists or layouts as campaign content
 */
export function ContentPickerModal({ playlists, layouts, existingContents, onSelect, onClose }) {
  const [tab, setTab] = useState('playlists');

  const isContentSelected = (type, id) => {
    return existingContents.some(c =>
      c.content_type === type && c.content_id === id
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add Content</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'playlists', label: 'Playlists', icon: ListMusic },
            { key: 'layouts', label: 'Layouts', icon: Layout }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'playlists' && (
            <div className="space-y-2">
              {playlists.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No playlists available</p>
              ) : (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => !isContentSelected('playlist', playlist.id) && onSelect('playlist', playlist.id)}
                    disabled={isContentSelected('playlist', playlist.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isContentSelected('playlist', playlist.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <ListMusic size={18} className="text-blue-600" />
                    <div className="flex-1">
                      <span className="font-medium">{playlist.name}</span>
                      {playlist.description && (
                        <p className="text-sm text-gray-500 truncate">{playlist.description}</p>
                      )}
                    </div>
                    {isContentSelected('playlist', playlist.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'layouts' && (
            <div className="space-y-2">
              {layouts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No layouts available</p>
              ) : (
                layouts.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => !isContentSelected('layout', layout.id) && onSelect('layout', layout.id)}
                    disabled={isContentSelected('layout', layout.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isContentSelected('layout', layout.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Layout size={18} className="text-purple-600" />
                    <div className="flex-1">
                      <span className="font-medium">{layout.name}</span>
                      {layout.template && (
                        <p className="text-sm text-gray-500">{layout.template}</p>
                      )}
                    </div>
                    {isContentSelected('layout', layout.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
