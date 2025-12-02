import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Alert } from '../design-system';
import { useTranslation } from '../i18n';
import { ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage = ({ onBack }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
          aria-label={t('forgotPassword.backToLogin', 'Back to login')}
        >
          <ArrowLeft size={20} aria-hidden="true" />
          <span className="text-sm font-medium">{t('forgotPassword.backToLogin', 'Back to login')}</span>
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl" aria-hidden="true"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            BizScreen
          </h1>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          {t('forgotPassword.title', 'Reset your password')}
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          {t('forgotPassword.subtitle', "Enter your email and we'll send you a reset link")}
        </p>

        {/* Messages */}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {message && <Alert variant="success" className="mb-4">{message}</Alert>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('forgotPassword.emailLabel', 'Email Address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={t('forgotPassword.emailPlaceholder', 'you@example.com')}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('forgotPassword.sending', 'Sending...') : t('forgotPassword.sendResetLink', 'Send Reset Link')}
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{t('forgotPassword.rememberPassword', 'Remember your password?')}{' '}
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
            >
              {t('forgotPassword.signIn', 'Sign in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
