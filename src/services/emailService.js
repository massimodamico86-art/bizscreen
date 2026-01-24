/**
 * Email Service
 *
 * Handles email sending via Resend API.
 * Used for alert notifications and transactional emails.
 */

import { Resend } from 'resend';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('emailService');

// Initialize Resend client (null if no API key)
const resend = import.meta.env.VITE_RESEND_API_KEY
  ? new Resend(import.meta.env.VITE_RESEND_API_KEY)
  : null;

/**
 * Send an alert notification email
 *
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {string} options.subject Email subject
 * @param {string} options.title Alert title
 * @param {string} options.message Alert message
 * @param {string} options.severity Alert severity (info, warning, critical)
 * @param {string} options.actionUrl URL for "View Details" button
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendAlertEmail({ to, subject, title, message, severity, actionUrl }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const html = buildAlertEmailHtml({ title, message, severity, actionUrl });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Alerts <alerts@bizscreen.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error('Resend API error', { error, to });
      return { success: false, error: error.message };
    }

    logger.info('Email sent successfully', { messageId: data.id, to });
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error('Failed to send email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Build HTML for alert notification email
 */
function buildAlertEmailHtml({ title, message, severity, actionUrl }) {
  const severityColors = {
    info: { bg: '#dbeafe', text: '#1e40af', label: 'Info' },
    warning: { bg: '#fef3c7', text: '#92400e', label: 'Warning' },
    critical: { bg: '#fee2e2', text: '#991b1b', label: 'Critical' },
  };

  const colors = severityColors[severity] || severityColors.info;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #f97316;">BizScreen</span>
        </div>

        <!-- Severity Badge -->
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: ${colors.bg}; color: ${colors.text};">
            ${colors.label}
          </span>
        </div>

        <!-- Title -->
        <h1 style="color: #111827; font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
          ${escapeHtml(title)}
        </h1>

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
          ${escapeHtml(message)}
        </p>

        <!-- CTA Button -->
        ${actionUrl ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
            View Details
          </a>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            You're receiving this because you have alert notifications enabled in BizScreen.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Send data export ready notification
 *
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {string} options.downloadUrl URL to download the export
 * @param {string} options.expiresAt Expiration date
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendExportReadyEmail({ to, downloadUrl, expiresAt }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = buildGdprEmailHtml({
      title: 'Your Data Export is Ready',
      message: `Your personal data export has been prepared and is ready for download. The download link will expire on ${expiryDate}.`,
      actionUrl: downloadUrl,
      actionText: 'Download Your Data',
      footer: 'This export contains all your personal data stored in BizScreen as required by GDPR Article 20 (Right to Data Portability).',
    });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Privacy <privacy@bizscreen.com>',
      to: [to],
      subject: 'Your BizScreen Data Export is Ready',
      html,
    });

    if (error) {
      logger.error('Export ready email failed', { error, to });
      return { success: false, error: error.message };
    }

    logger.info('Export ready email sent', { messageId: data.id, to });
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error('Failed to send export ready email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Send account deletion confirmation email (Day 1)
 *
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {string} options.scheduledDate Scheduled deletion date
 * @param {string} options.cancelUrl URL to cancel deletion
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendDeletionConfirmationEmail({ to, scheduledDate, cancelUrl }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const deletionDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = buildGdprEmailHtml({
      title: 'Account Deletion Scheduled',
      message: `Your account has been scheduled for permanent deletion on ${deletionDate}. During the 30-day grace period, you can still access your account in read-only mode and cancel the deletion if you change your mind.`,
      actionUrl: cancelUrl,
      actionText: 'Cancel Deletion',
      warning: 'After the grace period, all your data will be permanently deleted and cannot be recovered.',
      footer: 'You requested this deletion per GDPR Article 17 (Right to Erasure). If you did not request this, please contact support immediately.',
    });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Privacy <privacy@bizscreen.com>',
      to: [to],
      subject: 'Your BizScreen Account Deletion is Scheduled',
      html,
    });

    if (error) {
      logger.error('Deletion confirmation email failed', { error, to });
      return { success: false, error: error.message };
    }

    logger.info('Deletion confirmation email sent', { messageId: data.id, to });
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error('Failed to send deletion confirmation email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Send deletion reminder email (Day 7 and Day 25)
 *
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {number} options.daysRemaining Days until deletion
 * @param {string} options.cancelUrl URL to cancel deletion
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendDeletionReminderEmail({ to, daysRemaining, cancelUrl }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const isFinalWarning = daysRemaining <= 5;
    const title = isFinalWarning
      ? `Final Warning: ${daysRemaining} Days Until Account Deletion`
      : `Reminder: ${daysRemaining} Days Until Account Deletion`;

    const html = buildGdprEmailHtml({
      title,
      message: isFinalWarning
        ? `This is your final reminder. Your BizScreen account and all associated data will be permanently deleted in ${daysRemaining} days. This action cannot be undone.`
        : `Your BizScreen account is scheduled for deletion in ${daysRemaining} days. If you want to keep your account, you can cancel the deletion request.`,
      actionUrl: cancelUrl,
      actionText: 'Keep My Account',
      warning: isFinalWarning ? 'This is your last chance to cancel. After deletion, your data cannot be recovered.' : null,
      footer: 'You can cancel this deletion at any time before the scheduled date by logging in and visiting your privacy settings.',
    });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Privacy <privacy@bizscreen.com>',
      to: [to],
      subject: isFinalWarning
        ? `FINAL WARNING: Your BizScreen Account Will Be Deleted in ${daysRemaining} Days`
        : `Reminder: Your BizScreen Account Deletion in ${daysRemaining} Days`,
      html,
    });

    if (error) {
      logger.error('Deletion reminder email failed', { error, to });
      return { success: false, error: error.message };
    }

    logger.info('Deletion reminder email sent', { messageId: data.id, to, daysRemaining });
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error('Failed to send deletion reminder email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Send account deletion completed email
 *
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendDeletionCompletedEmail({ to }) {
  if (!resend) {
    logger.warn('Email not sent - VITE_RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const html = buildGdprEmailHtml({
      title: 'Account Deletion Complete',
      message: 'Your BizScreen account and all associated personal data have been permanently deleted from our systems. This includes your profile, content, media files, and activity history.',
      actionUrl: null,
      actionText: null,
      footer: 'Per GDPR Article 17, all your data has been erased from BizScreen and our third-party processors (cloud storage). Thank you for using BizScreen.',
    });

    const { data, error } = await resend.emails.send({
      from: 'BizScreen Privacy <privacy@bizscreen.com>',
      to: [to],
      subject: 'Your BizScreen Account Has Been Deleted',
      html,
    });

    if (error) {
      logger.error('Deletion completed email failed', { error, to });
      return { success: false, error: error.message };
    }

    logger.info('Deletion completed email sent', { messageId: data.id, to });
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error('Failed to send deletion completed email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Build HTML for GDPR notification emails
 *
 * @param {Object} options Template options
 * @param {string} options.title Email title
 * @param {string} options.message Email message
 * @param {string|null} options.actionUrl CTA button URL
 * @param {string|null} options.actionText CTA button text
 * @param {string|null} options.warning Warning message (optional)
 * @param {string} options.footer Footer text
 * @returns {string} HTML email content
 */
function buildGdprEmailHtml({ title, message, actionUrl, actionText, warning, footer }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700; color: #f97316;">BizScreen</span>
        </div>

        <!-- Privacy Badge -->
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #dbeafe; color: #1e40af;">
            Privacy Notice
          </span>
        </div>

        <!-- Title -->
        <h1 style="color: #111827; font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
          ${escapeHtml(title)}
        </h1>

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
          ${escapeHtml(message)}
        </p>

        ${warning ? `
        <!-- Warning Box -->
        <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
            <strong>Warning:</strong> ${escapeHtml(warning)}
          </p>
        </div>
        ` : ''}

        ${actionUrl && actionText ? `
        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
            ${escapeHtml(actionText)}
          </a>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            ${escapeHtml(footer)}
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default {
  sendAlertEmail,
  sendExportReadyEmail,
  sendDeletionConfirmationEmail,
  sendDeletionReminderEmail,
  sendDeletionCompletedEmail,
};
