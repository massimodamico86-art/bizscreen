import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';

export const LoginPage = () => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        await signUp(email, password, fullName);
        setMessage('Account created! Please check your email for verification.');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setForgotPasswordLoading(true);

    try {
      await resetPassword(forgotPasswordEmail);
      setMessage('Password reset email sent! Please check your inbox.');
      setForgotPasswordEmail('');
      setTimeout(() => setShowForgotPassword(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleOAuthSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl" aria-hidden="true"></div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              BizScreen
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {t('login.resetPassword.title', 'Reset your password')}
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            {t('login.resetPassword.subtitle', "Enter your email and we'll send you a reset link")}
          </p>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {message && <Alert variant="success" className="mb-4">{message}</Alert>}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.emailLabel', 'Email Address')}
              </label>
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder={t('login.emailPlaceholder', 'Email address')}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? t('login.sending', 'Sending...') : t('login.sendResetLink', 'Send Reset Link')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setMessage('');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
            >
              {t('login.backToLogin', 'Back to login')}
            </button>
          </div>
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
          {isSignUp ? t('login.createAccount', 'Create your account') : t('login.welcomeBack', 'Welcome back')}
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          {isSignUp
            ? t('login.signUpSubtitle', 'Sign up to get started with BizScreen')
            : t('login.signInSubtitle', 'Sign in to access your dashboard')}
        </p>

        {/* Messages */}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {message && <Alert variant="success" className="mb-4">{message}</Alert>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.fullNameLabel', 'Full Name')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder={t('login.fullNamePlaceholder', 'John Doe')}
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('login.email', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={t('login.emailPlaceholder', 'Email address')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('login.password', 'Password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={t('login.passwordPlaceholder', 'Password')}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('login.pleaseWait', 'Please wait...') : isSignUp ? t('login.signUp', 'Sign Up') : t('login.signIn', 'Sign In')}
          </Button>
        </form>

        {/* Forgot Password Link */}
        {!isSignUp && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
            >
              {t('login.forgotPassword', 'Forgot your password?')}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{t('login.orContinueWith', 'Or continue with')}</span>
          </div>
        </div>

        {/* OAuth Button */}
        <button
          onClick={handleOAuthSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <Mail size={20} className="text-red-500" aria-hidden="true" />
          <span className="font-medium text-gray-700">{t('login.continueWithGoogle', 'Continue with Google')}</span>
        </button>

        {/* Toggle Sign In/Sign Up */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
          >
            {isSignUp
              ? t('login.alreadyHaveAccount', 'Already have an account? Sign in')
              : t('login.noAccount', "Don't have an account? Sign up")}
          </button>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">{t('login.demoCredentials', 'Demo Credentials:')}</p>
          <p className="text-xs text-gray-600">{t('login.demoEmail', 'Email: demo@bizscreen.app')}</p>
          <p className="text-xs text-gray-600">{t('login.demoPassword', 'Password: testpassword123')}</p>
        </div>
      </div>
    </div>
  );
};
