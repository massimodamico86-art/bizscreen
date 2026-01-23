/**
 * FeedbackWidget Component
 *
 * An unobtrusive floating feedback button that opens a modal for
 * submitting feedback, bug reports, and feature requests.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquarePlus, X, Bug, Lightbulb, MessageCircle, ThumbsUp, ThumbsDown, Send, Check, Loader2 } from 'lucide-react';
import { submitQuickFeedback, submitBugReport, submitFeatureRequest, FeedbackTypes } from '../services/feedbackService';
import { useLogger } from '../hooks/useLogger.js';

const feedbackCategories = [
  {
    type: FeedbackTypes.BUG,
    label: 'Report a Bug',
    icon: Bug,
    color: 'text-red-500',
    bgColor: 'bg-red-50 hover:bg-red-100',
    description: 'Something isn\'t working correctly',
  },
  {
    type: FeedbackTypes.FEATURE_REQUEST,
    label: 'Request Feature',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    description: 'Suggest a new feature or improvement',
  },
  {
    type: FeedbackTypes.GENERAL,
    label: 'General Feedback',
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    description: 'Share your thoughts with us',
  },
];

export function FeedbackWidget({ position = 'bottom-right' }) {
  const logger = useLogger('FeedbackWidget');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage] = useState('');
  const [sentiment, setSentiment] = useState(null); // -1, 0, 1
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'

  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSelectedType(null);
    setMessage('');
    setSentiment(null);
    setSubmitStatus(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedType(null);
    setMessage('');
    setSentiment(null);
    setSubmitStatus(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      let result;
      if (selectedType === FeedbackTypes.BUG) {
        result = await submitBugReport(message.trim());
      } else if (selectedType === FeedbackTypes.FEATURE_REQUEST) {
        // For feature requests, first line is title, rest is description
        const lines = message.trim().split('\n');
        const title = lines[0];
        const description = lines.slice(1).join('\n').trim() || title;
        result = await submitFeatureRequest(title, description);
      } else {
        result = await submitQuickFeedback(selectedType, message.trim(), {
          sentiment: sentiment,
        });
      }

      if (result.success) {
        setSubmitStatus('success');
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('Failed to submit feedback', { feedbackType: selectedType, error: error.message });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, message, sentiment, handleClose, logger]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={`
          fixed ${positionStyles[position]}
          z-40
          w-12 h-12 rounded-full
          bg-gray-900 text-white
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-200
          hover:scale-105 active:scale-95
        `}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
            onClick={handleClose}
          />

          {/* Modal panel */}
          <div className="
            relative w-full max-w-md
            bg-white rounded-xl shadow-modal
            animate-scale-in
            overflow-hidden
          ">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 pr-12">
              <h2 className="text-lg font-semibold text-gray-900">
                {submitStatus === 'success' ? 'Thank You!' : 'Send Feedback'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {submitStatus === 'success'
                  ? 'Your feedback has been submitted.'
                  : 'Help us improve your experience'
                }
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="
                absolute right-4 top-4
                p-1.5 rounded-lg
                text-gray-400 hover:text-gray-600 hover:bg-gray-100
                transition-colors duration-100
              "
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="px-6 pb-6">
              {submitStatus === 'success' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-600">
                    We appreciate you taking the time to share your thoughts.
                  </p>
                </div>
              ) : !selectedType ? (
                /* Category selection */
                <div className="space-y-2">
                  {feedbackCategories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.type}
                        onClick={() => setSelectedType(category.type)}
                        className={`
                          w-full p-4 rounded-lg border border-gray-200
                          flex items-center gap-4
                          text-left
                          ${category.bgColor}
                          transition-colors duration-100
                        `}
                      >
                        <div className={`flex-shrink-0 ${category.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {category.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {category.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Feedback form */
                <div className="space-y-4">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    &larr; Back
                  </button>

                  {/* Message textarea */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedType === FeedbackTypes.BUG
                        ? 'Describe the issue'
                        : selectedType === FeedbackTypes.FEATURE_REQUEST
                        ? 'Describe your idea'
                        : 'Your feedback'
                      }
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        selectedType === FeedbackTypes.BUG
                          ? 'What happened? What did you expect to happen?'
                          : selectedType === FeedbackTypes.FEATURE_REQUEST
                          ? 'Title on first line, then description...'
                          : 'Tell us what you think...'
                      }
                      rows={5}
                      className="
                        w-full px-3 py-2
                        border border-gray-300 rounded-lg
                        text-sm
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                        resize-none
                      "
                      autoFocus
                    />
                  </div>

                  {/* Sentiment (for general feedback) */}
                  {selectedType === FeedbackTypes.GENERAL && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How do you feel about this?
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSentiment(sentiment === 1 ? null : 1)}
                          className={`
                            flex-1 py-2 px-4 rounded-lg border
                            flex items-center justify-center gap-2
                            transition-all duration-100
                            ${sentiment === 1
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }
                          `}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Positive
                        </button>
                        <button
                          onClick={() => setSentiment(sentiment === -1 ? null : -1)}
                          className={`
                            flex-1 py-2 px-4 rounded-lg border
                            flex items-center justify-center gap-2
                            transition-all duration-100
                            ${sentiment === -1
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }
                          `}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Negative
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {submitStatus === 'error' && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      Failed to submit feedback. Please try again.
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="
                      w-full py-2.5 px-4
                      bg-gray-900 text-white font-medium rounded-lg
                      flex items-center justify-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:bg-gray-800
                      transition-colors duration-100
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default FeedbackWidget;
