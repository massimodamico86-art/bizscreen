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

export default { sendAlertEmail };
