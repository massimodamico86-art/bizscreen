/**
 * PendingApprovalsWidget.jsx
 * Dashboard widget showing pending content awaiting approval.
 * Only visible to users who can approve content (owners, managers).
 */
import { useState, useEffect } from 'react';
import {
  ListVideo,
  Layout,
  Zap,
  Film,
} from 'lucide-react';
import { fetchOpenReviews, REVIEW_STATUS } from '../../services/approvalService';
import { canApproveContent } from '../../services/permissionsService';
import { formatDistanceToNow } from 'date-fns';

// Icon mapping for resource types
const RESOURCE_ICONS = {
  playlist: ListVideo,
  layout: Layout,
  campaign: Zap,
  scene: Film,
};

/**
 * Single review item row
 * @param {Object} props
 * @param {Object} props.review - Review request object
 * @param {(page: string) => void} props.onNavigate - Navigation handler (setCurrentPage from DashboardPage)
 */
function ReviewItem({ review, onNavigate }) {
  const Icon = RESOURCE_ICONS[review.resource_type] || ListVideo;
  const timeAgo = review.requested_at
    ? formatDistanceToNow(new Date(review.requested_at), { addSuffix: true })
    : '';

  return (
    <button
      onClick={() => onNavigate('review-inbox')}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      <div className="p-2 bg-yellow-50 rounded-lg flex-shrink-0">
        <Icon className="w-4 h-4 text-yellow-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {review.resource_name || review.title || 'Untitled'}
        </p>
        <p className="text-xs text-gray-500">
          {review.requested_by_name || 'Unknown'} &middot; {timeAgo}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

/**
 * Pending approvals widget for dashboard
 * Shows up to 5 pending reviews with a "View all" link
 *
 * @param {Object} props
 * @param {(page: string) => void} props.onNavigate - Navigation handler (setCurrentPage from parent)
 * @param {string} [props.className] - Additional CSS classes
 */
export function PendingApprovalsWidget({ onNavigate, className = '' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user can approve
        const hasPermission = await canApproveContent();
        setCanApprove(hasPermission);

        if (!hasPermission) {
          setLoading(false);
          return;
        }

        // Fetch open reviews (FIFO - oldest first per RESEARCH.md recommendation)
        const data = await fetchOpenReviews({ status: REVIEW_STATUS.OPEN });
        // Sort by oldest first for fairness
        const sorted = (data || []).sort(
          (a, b) => new Date(a.requested_at) - new Date(b.requested_at)
        );
        setReviews(sorted);
      } catch (error) {
        console.error('Error loading pending approvals:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Don't render if user can't approve
  if (!canApprove) return null;

  // Don't render if no pending reviews
  if (!loading && reviews.length === 0) return null;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
        </div>
        {reviews.length > 0 && (
          <Badge variant="warning">{reviews.length}</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {reviews.slice(0, 5).map((review) => (
              <ReviewItem key={review.id} review={review} onNavigate={onNavigate} />
            ))}
          </div>

          {reviews.length > 5 && (
            <Button
              variant="link"
              className="w-full mt-3"
              onClick={() => onNavigate('review-inbox')}
            >
              View all {reviews.length} pending
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {reviews.length <= 5 && reviews.length > 0 && (
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => onNavigate('review-inbox')}
            >
              View Review Inbox
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

export default PendingApprovalsWidget;
