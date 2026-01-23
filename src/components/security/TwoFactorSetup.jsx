/**
 * TwoFactorSetup - Component for setting up and managing 2FA/MFA
 */

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, AlertCircle, Key } from 'lucide-react';
import { Button, Card } from '../../design-system';
import {
  getMfaStatus,
  enrollMfa,
  verifyEnrollment,
  disableMfa,
  generateRecoveryCodes,
} from '../../services/mfaService';
import { useLogger } from '../../hooks/useLogger.js';

export default function TwoFactorSetup({ showToast }) {
  const logger = useLogger('TwoFactorSetup');
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState({ enrolled: false, verified: false, factors: [] });
  const [step, setStep] = useState('status'); // status, setup, verify, recovery, disable
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMfaStatus();
  }, []);

  const loadMfaStatus = async () => {
    setLoading(true);
    try {
      const status = await getMfaStatus();
      setMfaStatus(status);
    } catch (err) {
      logger.error('Error loading MFA status', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setError('');
    setStep('setup');
    setLoading(true);

    try {
      const result = await enrollMfa('BizScreen');
      if (result.success) {
        setEnrollmentData(result);
      } else {
        setError(result.error || 'Failed to start MFA setup');
        setStep('status');
      }
    } catch (err) {
      setError(err.message || 'Failed to start MFA setup');
      setStep('status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      const result = await verifyEnrollment(enrollmentData.factorId, verificationCode);
      if (result.success) {
        // Generate recovery codes
        const recoveryResult = await generateRecoveryCodes();
        if (recoveryResult.success) {
          setRecoveryCodes(recoveryResult.codes);
        }
        setStep('recovery');
        showToast?.('Two-factor authentication enabled successfully!');
        await loadMfaStatus();
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    try {
      const factor = mfaStatus.factors.find(f => f.status === 'verified');
      if (factor) {
        const result = await disableMfa(factor.id);
        if (result.success) {
          showToast?.('Two-factor authentication disabled');
          await loadMfaStatus();
          setStep('status');
        } else {
          setError(result.error || 'Failed to disable MFA');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    setStep('status');
    setRecoveryCodes([]);
    setVerificationCode('');
    setEnrollmentData(null);
  };

  if (loading && step === 'status') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Status view - show current MFA status
  if (step === 'status') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          {mfaStatus.verified ? (
            <div className="p-3 bg-green-100 rounded-full">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
          ) : (
            <div className="p-3 bg-gray-100 rounded-full">
              <Shield className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {mfaStatus.verified ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mfaStatus.verified
                ? 'Your account is protected with an authenticator app. You\'ll need to enter a code when signing in.'
                : 'Add an extra layer of security to your account by requiring a verification code from an authenticator app.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {mfaStatus.verified ? (
            <Button variant="outline" onClick={handleDisable} disabled={loading}>
              <ShieldOff className="w-4 h-4" />
              Disable 2FA
            </Button>
          ) : (
            <Button onClick={handleStartSetup} disabled={loading}>
              <Shield className="w-4 h-4" />
              Enable 2FA
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Setup view - show QR code
  if (step === 'setup') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Set Up Authenticator App</h3>
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : enrollmentData ? (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-white border rounded-lg">
                <img
                  src={enrollmentData.qrCode}
                  alt="QR Code for authenticator app"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Can't scan the QR code? Enter this key manually:
              </p>
              <code className="block text-sm bg-white p-2 rounded border font-mono break-all">
                {enrollmentData.secret}
              </code>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep('status');
                    setEnrollmentData(null);
                    setVerificationCode('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verificationCode.length !== 6 || verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </div>
    );
  }

  // Recovery codes view
  if (step === 'recovery') {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-100 rounded-full">
            <Key className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Save Your Recovery Codes</h3>
            <p className="text-sm text-gray-600 mt-1">
              If you lose access to your authenticator app, you can use these codes to sign in. Each code can only be used once.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="bg-white p-2 rounded border text-center">
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Store these codes in a secure place. You won't be able to see them again after leaving this page.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCopyRecoveryCodes}>
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Codes
              </>
            )}
          </Button>
          <Button onClick={handleFinish}>
            I've Saved My Codes
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
