import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ListVideo,
  Layout,
  Zap,
  Filter,
  ChevronRight,
  Send,
  RefreshCw,
  Calendar,
  User,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  fetchReviews,
  fetchReview,
  approveReview,
  rejectReview,
  addReviewComment,
  getApprovalStatusConfig,
  REVIEW_STATUS
} from '../services/approvalService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter
} from '../design-system';

// Status configuration
const STATUS_CONFIG = {
  open: { label: 'Open', color: 'yellow', icon: Clock },
  approved: { label: 'Approved', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'gray', icon: XCircle }
};

// Resource type icons
const RESOURCE_ICONS = {
  playlist: ListVideo,
  layout: Layout,
  campaign: Zap
};

const ReviewInboxPage = ({ showToast, onNavigate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');

  // Detail drawer state
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(null); // 'approve' | 'reject' | null
  const [decisionComment, setDecisionComment] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Load reviews
  useEffect(() => {
    loadReviews();
  }, [statusFilter, typeFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await fetchReviews({
        status: statusFilter,
        resourceType: typeFilter
      });
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      showToast?.('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load review detail
  const loadReviewDetail = async (reviewId) => {
    try {
      setLoadingDetail(true);
      const data = await fetchReview(reviewId);
      setReviewDetail(data);
    } catch (error) {
      console.error('Error loading review detail:', error);
      showToast?.('Failed to load review details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle row click
  const handleRowClick = (review) => {
    setSelectedReview(review);
    loadReviewDetail(review.id);
  };

  // Close detail drawer
  const closeDrawer = () => {
    setSelectedReview(null);
    setReviewDetail(null);
    setNewComment('');
  };

  // Submit comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedReview) return;

    try {
      setSubmittingComment(true);
      const comment = await addReviewComment(selectedReview.id, newComment.trim());

      // Update local state
      setReviewDetail(prev => ({
        ...prev,
        comments: [...(prev.comments || []), comment]
      }));
      setNewComment('');
      showToast?.('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast?.('Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedReview) return;

    try {
      setSubmittingDecision(true);
      await approveReview(selectedReview.id, { comment: decisionComment });
      showToast?.('Review approved');
      setShowDecisionModal(null);
      setDecisionComment('');
      closeDrawer();
      loadReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      showToast?.('Failed to approve review', 'error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedReview || !decisionComment.trim()) {
      showToast?.('A comment is required when rejecting', 'error');
      return;
    }

    try {
      setSubmittingDecision(true);
      await rejectReview(selectedReview.id, { comment: decisionComment });
      showToast?.('Review rejected');
      setShowDecisionModal(null);
      setDecisionComment('');
      closeDrawer();
      loadReviews();
    } catch (error) {
      console.error('Error rejecting review:', error);
      showToast?.('Failed to reject review', 'error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Navigate to resource editor
  const handleNavigateToResource = (resourceType, resourceId) => {
    const routes = {
      playlist: `playlist-editor-${resourceId}`,
      layout: `layout-editor-${resourceId}`,
      campaign: `campaign-editor-${resourceId}`
    };
    onNavigate?.(routes[resourceType]);
  };

  // Filter reviews by search
  const filteredReviews = reviews.filter(review => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.title?.toLowerCase().includes(searchLower) ||
      review.resource_name?.toLowerCase().includes(searchLower) ||
      review.requested_by_name?.toLowerCase().includes(searchLower)
    );
  });

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Count by status
  const counts = {
    open: reviews.filter(r => r.status === 'open').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('reviews.title', 'Reviews')}
        description={t('reviews.description', 'Manage content review requests and approvals')}
        icon={<MessageSquare className="w-5 h-5 text-orange-600" />}
        iconBackground="bg-orange-100"
        actions={
          <Button variant="secondary" onClick={loadReviews} icon={<RefreshCw size={16} />}>
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      <PageContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center" aria-hidden="true">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.open}</p>
                <p className="text-sm text-gray-500">{t('reviews.pendingReview', 'Pending Review')}</p>
              </div>
            </div>
          </Card>
          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.approved}</p>
                <p className="text-sm text-gray-500">{t('reviews.approved', 'Approved')}</p>
              </div>
            </div>
          </Card>
          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center" aria-hidden="true">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.rejected}</p>
                <p className="text-sm text-gray-500">{t('reviews.rejected', 'Rejected')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap mb-6">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('reviews.searchPlaceholder', 'Search reviews...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              aria-label={t('reviews.searchReviews', 'Search reviews')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              aria-label={t('reviews.filterByStatus', 'Filter by status')}
            >
              <option value="all">{t('reviews.allStatus', 'All Status')}</option>
              <option value="open">{t('reviews.open', 'Open')}</option>
              <option value="approved">{t('reviews.approved', 'Approved')}</option>
              <option value="rejected">{t('reviews.rejected', 'Rejected')}</option>
              <option value="cancelled">{t('reviews.cancelled', 'Cancelled')}</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            aria-label={t('reviews.filterByType', 'Filter by type')}
          >
            <option value="all">{t('reviews.allTypes', 'All Types')}</option>
            <option value="playlist">{t('reviews.playlists', 'Playlists')}</option>
            <option value="layout">{t('reviews.layouts', 'Layouts')}</option>
            <option value="campaign">{t('reviews.campaigns', 'Campaigns')}</option>
          </select>
        </div>

        {/* Reviews Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title={t('reviews.noReviewsFound', 'No reviews found')}
            description={statusFilter === 'open'
              ? t('reviews.noPendingReviews', 'No pending reviews at this time.')
              : t('reviews.noMatchingReviews', 'No reviews match your filters.')}
          />
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('reviews.reviewsTable', 'Reviews table')}>
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableTitle', 'TITLE')}</th>
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableResource', 'RESOURCE')}</th>
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableStatus', 'STATUS')}</th>
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableRequestedBy', 'REQUESTED BY')}</th>
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableDate', 'DATE')}</th>
                    <th scope="col" className="p-4 font-medium">{t('reviews.tableDue', 'DUE')}</th>
                    <th scope="col" className="p-4 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map(review => {
                    const statusConfig = STATUS_CONFIG[review.status] || STATUS_CONFIG.open;
                    const ResourceIcon = RESOURCE_ICONS[review.resource_type] || ListVideo;

                    return (
                      <tr
                        key={review.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(review)}
                      >
                        <td className="p-4">
                          <div>
                            <span className="font-medium text-gray-900">{review.title}</span>
                            {review.comment_count > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                                <MessageSquare size={12} aria-hidden="true" />
                                {review.comment_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              review.resource_type === 'playlist' ? 'bg-orange-100' :
                              review.resource_type === 'layout' ? 'bg-purple-100' :
                              'bg-indigo-100'
                            }`} aria-hidden="true">
                              <ResourceIcon size={16} className={
                                review.resource_type === 'playlist' ? 'text-orange-600' :
                                review.resource_type === 'layout' ? 'text-purple-600' :
                                'text-indigo-600'
                              } />
                            </div>
                            <div>
                              <span className="text-gray-900">{review.resource_name || '-'}</span>
                              <p className="text-xs text-gray-500 capitalize">{review.resource_type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={
                            review.status === 'open' ? 'warning' :
                            review.status === 'approved' ? 'success' :
                            review.status === 'rejected' ? 'danger' : 'secondary'
                          }>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600">
                          {review.requested_by_name || '-'}
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {formatDate(review.requested_at)}
                        </td>
                        <td className="p-4 text-sm">
                          {review.due_at ? (
                            <span className={new Date(review.due_at) < new Date() ? 'text-red-600' : 'text-gray-600'}>
                              {formatDate(review.due_at)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Detail Drawer */}
        {selectedReview && (
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} aria-hidden="true" />
            <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h2 id="drawer-title" className="text-lg font-bold text-gray-900">{selectedReview.title}</h2>
                  <p className="text-sm text-gray-500 capitalize">{selectedReview.resource_type} {t('reviews.review', 'Review')}</p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={t('common.close', 'Close')}
                >
                  <X size={20} className="text-gray-400" aria-hidden="true" />
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-600" aria-label={t('common.loading', 'Loading')} />
                </div>
              ) : reviewDetail && (
                <>
                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Status & Actions */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant={
                          reviewDetail.status === 'open' ? 'warning' :
                          reviewDetail.status === 'approved' ? 'success' :
                          reviewDetail.status === 'rejected' ? 'danger' : 'secondary'
                        }>
                          {STATUS_CONFIG[reviewDetail.status]?.label || reviewDetail.status}
                        </Badge>
                        {reviewDetail.status === 'open' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setShowDecisionModal('reject')}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              icon={<XCircle size={14} />}
                            >
                              {t('reviews.reject', 'Reject')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setShowDecisionModal('approve')}
                              className="bg-green-600 hover:bg-green-700"
                              icon={<CheckCircle size={14} />}
                            >
                              {t('reviews.approve', 'Approve')}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Resource Link */}
                      <button
                        onClick={() => handleNavigateToResource(reviewDetail.resource_type, reviewDetail.resource_id)}
                        className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = RESOURCE_ICONS[reviewDetail.resource_type] || ListVideo;
                            return <Icon size={20} className="text-gray-500" aria-hidden="true" />;
                          })()}
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{reviewDetail.resource_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{t('reviews.openInEditor', 'Open in editor')}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Request Details */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">{t('reviews.requestDetails', 'Request Details')}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">{t('reviews.requestedBy', 'Requested by')}</p>
                          <p className="font-medium">{reviewDetail.requested_by_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('reviews.requestedAt', 'Requested at')}</p>
                          <p className="font-medium">{formatDateTime(reviewDetail.requested_at)}</p>
                        </div>
                        {reviewDetail.due_at && (
                          <div>
                            <p className="text-gray-500">{t('reviews.dueDate', 'Due date')}</p>
                            <p className={`font-medium ${new Date(reviewDetail.due_at) < new Date() ? 'text-red-600' : ''}`}>
                              {formatDate(reviewDetail.due_at)}
                            </p>
                          </div>
                        )}
                        {reviewDetail.decided_by_name && (
                          <>
                            <div>
                              <p className="text-gray-500">{t('reviews.decidedBy', 'Decided by')}</p>
                              <p className="font-medium">{reviewDetail.decided_by_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">{t('reviews.decisionDate', 'Decision date')}</p>
                              <p className="font-medium">{formatDateTime(reviewDetail.decided_at)}</p>
                            </div>
                          </>
                        )}
                      </div>
                      {reviewDetail.message && (
                        <div className="mt-3">
                          <p className="text-gray-500 text-sm mb-1">{t('reviews.message', 'Message')}</p>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reviewDetail.message}</p>
                        </div>
                      )}
                      {reviewDetail.decision_comment && (
                        <div className="mt-3">
                          <p className="text-gray-500 text-sm mb-1">{t('reviews.decisionComment', 'Decision Comment')}</p>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reviewDetail.decision_comment}</p>
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">{t('reviews.commentsCount', 'Comments ({{count}})', { count: reviewDetail.comments?.length || 0 })}</h3>
                      <div className="space-y-3">
                        {reviewDetail.comments?.length === 0 ? (
                          <p className="text-gray-500 text-sm">{t('reviews.noComments', 'No comments yet.')}</p>
                        ) : (
                          reviewDetail.comments?.map(comment => (
                            <div
                              key={comment.id}
                              className={`p-3 rounded-lg ${comment.is_external ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{comment.author_name}</span>
                                {comment.is_external && (
                                  <Badge variant="info" className="text-xs">{t('reviews.external', 'External')}</Badge>
                                )}
                                <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
                              </div>
                              <p className="text-gray-700 text-sm">{comment.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Input */}
                  {reviewDetail.status === 'open' && (
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('reviews.addCommentPlaceholder', 'Add a comment...')}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          aria-label={t('reviews.addComment', 'Add comment')}
                        />
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          icon={<Send size={16} />}
                          aria-label={t('reviews.sendComment', 'Send comment')}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Decision Modal */}
        {showDecisionModal && (
          <Modal isOpen onClose={() => setShowDecisionModal(null)} size="md">
            <ModalHeader>
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  showDecisionModal === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`} aria-hidden="true">
                  {showDecisionModal === 'approve' ? (
                    <CheckCircle size={24} className="text-green-600" />
                  ) : (
                    <XCircle size={24} className="text-red-600" />
                  )}
                </div>
                <ModalTitle>
                  {showDecisionModal === 'approve' ? t('reviews.approveReview', 'Approve Review') : t('reviews.rejectReview', 'Reject Review')}
                </ModalTitle>
                <p className="text-gray-500 text-sm mt-2">
                  {showDecisionModal === 'approve'
                    ? t('reviews.approveDescription', 'This will mark the content as approved.')
                    : t('reviews.rejectDescription', 'Please provide feedback for the rejection.')}
                </p>
              </div>
            </ModalHeader>
            <ModalContent>
              <div>
                <label htmlFor="decision-comment" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reviews.comment', 'Comment')} {showDecisionModal === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="decision-comment"
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={showDecisionModal === 'approve' ? t('reviews.optionalComment', 'Optional comment...') : t('reviews.rejectionReason', 'Reason for rejection...')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </ModalContent>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDecisionModal(null);
                  setDecisionComment('');
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className={showDecisionModal === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={showDecisionModal === 'approve' ? handleApprove : handleReject}
                disabled={submittingDecision || (showDecisionModal === 'reject' && !decisionComment.trim())}
              >
                {submittingDecision
                  ? t('reviews.submitting', 'Submitting...')
                  : showDecisionModal === 'approve'
                    ? t('reviews.approve', 'Approve')
                    : t('reviews.reject', 'Reject')
                }
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </PageContent>
    </PageLayout>
  );
};

export default ReviewInboxPage;
