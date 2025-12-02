import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Alert } from '../design-system';
import { useTranslation } from '../i18n';
import { CheckCircle } from 'lucide-react';

export const ResetPasswordPage = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { updatePassword, user } = useAuth();

  // Check if user is in password recovery mode
  useEffect(() => {
    if (!user) {
      setError('Invalid or expired password reset link. Please request a new one.');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle size={64} className="text-green-500" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('resetPassword.successTitle', 'Password Reset Successful!')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('resetPassword.successMessage', 'Your password has been updated. Redirecting to dashboard...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl" aria-hidden="true"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            BizScreen
          </h1>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          {t('resetPassword.title', 'Set new password')}
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          {t('resetPassword.subtitle', 'Enter your new password below')}
        </p>

        {/* Error Message */}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('resetPassword.newPasswordLabel', 'New Password')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">{t('resetPassword.minChars', 'At least 6 characters')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('resetPassword.confirmPasswordLabel', 'Confirm New Password')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !user}
          >
            {loading ? t('resetPassword.updating', 'Updating...') : t('resetPassword.updatePassword', 'Update Password')}
          </Button>
        </form>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">{t('resetPassword.requirementsTitle', 'Password Requirements:')}</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>{t('resetPassword.requirement1', '• At least 6 characters long')}</li>
            <li>{t('resetPassword.requirement2', '• Passwords must match')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
