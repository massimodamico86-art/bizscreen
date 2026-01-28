/**
 * MfaVerification - Component for MFA verification during login
 */

import { useState } from 'react';
import { verifyMfaLogin, verifyRecoveryCode } from '../../services/mfaService';

export default function MfaVerification({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      let result;
      if (useRecoveryCode) {
        result = await verifyRecoveryCode(code);
      } else {
        result = await verifyMfaLogin(code);
      }

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          {useRecoveryCode ? (
            <Key className="w-6 h-6 text-blue-600" />
          ) : (
            <Shield className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {useRecoveryCode ? 'Enter Recovery Code' : 'Two-Factor Authentication'}
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {useRecoveryCode
            ? 'Enter one of your recovery codes to sign in.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              if (useRecoveryCode) {
                setCode(e.target.value.toUpperCase());
              } else {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              }
            }}
            placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl tracking-widest font-mono"
            maxLength={useRecoveryCode ? 9 : 6}
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

        <Button
          type="submit"
          className="w-full"
          disabled={(useRecoveryCode ? code.length < 8 : code.length !== 6) || verifying}
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setCode('');
              setError('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {useRecoveryCode ? 'Use authenticator app instead' : 'Use a recovery code instead'}
          </button>
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </form>
    </div>
  );
}
