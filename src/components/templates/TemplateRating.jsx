/**
 * Template Rating Component
 *
 * Displays interactive star rating for templates.
 * Shows user's rating (editable) and average rating (read-only).
 *
 * @module components/templates/TemplateRating
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { rateTemplate, getTemplateRatingStats } from '../../services/marketplaceService';

// Debounce timeout for rating changes
const DEBOUNCE_MS = 300;

export function TemplateRating({ templateId, onRatingChange }) {
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // Fetch initial rating stats
  useEffect(() => {
    if (!templateId) return;

    let mounted = true;
    setLoading(true);

    getTemplateRatingStats(templateId)
      .then((stats) => {
        if (mounted) {
          setUserRating(stats.userRating || 0);
          setAverageRating(stats.averageRating || 0);
          setTotalRatings(stats.totalRatings || 0);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch rating stats:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [templateId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Debounced rating submission
  const handleRatingChange = useCallback(
    (value) => {
      // Optimistic update
      setUserRating(value);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounced API call
      timeoutRef.current = setTimeout(() => {
        rateTemplate(templateId, value)
          .then((result) => {
            setAverageRating(result.averageRating || 0);
            setTotalRatings(result.totalRatings || 0);
            onRatingChange?.(value);
          })
          .catch((err) => {
            console.error('Failed to submit rating:', err);
            // Could revert optimistic update here if needed
          });
      }, DEBOUNCE_MS);
    },
    [templateId, onRatingChange]
  );

  if (loading) {
    return (
      <div className="h-8 bg-gray-100 rounded animate-pulse" />
    );
  }

  return (
    <div className="space-y-2">
      {/* User's interactive rating */}
      <div className="flex items-center gap-3">
        <Rating
          style={{ maxWidth: 120 }}
          value={userRating}
          onChange={handleRatingChange}
          items={5}
        />
        <span className="text-sm text-gray-500">
          {userRating > 0 ? 'Your rating' : 'Rate this template'}
        </span>
      </div>

      {/* Average rating display */}
      {totalRatings > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Rating
            style={{ maxWidth: 80 }}
            value={averageRating}
            readOnly
          />
          <span>
            {Number(averageRating).toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      )}
    </div>
  );
}

TemplateRating.propTypes = {
  templateId: PropTypes.string.isRequired,
  onRatingChange: PropTypes.func,
};

export default TemplateRating;
