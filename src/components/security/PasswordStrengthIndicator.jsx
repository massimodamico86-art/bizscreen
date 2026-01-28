/**
 * PasswordStrengthIndicator - Visual indicator for password strength
 */

import { useState, useEffect } from 'react';
import { validatePassword, checkPasswordBreach } from '../../services/passwordService';

export default function PasswordStrengthIndicator({
  password,
  email = '',
  onValidationChange,
  checkBreaches = true,
  showRequirements = true,
}) {
  const [validation, setValidation] = useState(null);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [breachResult, setBreachResult] = useState(null);

  // Validate password on change
  useEffect(() => {
    if (!password) {
      setValidation(null);
      setBreachResult(null);
      onValidationChange?.({ valid: false });
      return;
    }

    const result = validatePassword(password, email);
    setValidation(result);

    // Only check breaches if password passes basic validation
    if (checkBreaches && result.valid && password.length >= 8) {
      // Debounce breach check
      const timer = setTimeout(async () => {
        setCheckingBreach(true);
        const breach = await checkPasswordBreach(password);
        setBreachResult(breach);
        setCheckingBreach(false);

        // Update validation with breach result
        if (breach.breached) {
          const updatedResult = {
            ...result,
            valid: false,
            breached: true,
            breachCount: breach.count,
            errors: [
              ...result.errors,
              `This password appeared in ${breach.count.toLocaleString()} data breach${breach.count > 1 ? 'es' : ''}`,
            ],
          };
          setValidation(updatedResult);
          onValidationChange?.(updatedResult);
        } else {
          onValidationChange?.(result);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setBreachResult(null);
      onValidationChange?.(result);
    }
  }, [password, email, checkBreaches]);

  if (!password) {
    return null;
  }

  const strengthColors = {
    0: 'bg-gray-200',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-lime-500',
    5: 'bg-green-500',
  };

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
  ];

  return (
    <div className="mt-2 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                validation?.score >= level ? strengthColors[level] : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className={`font-medium ${validation?.valid ? 'text-green-600' : 'text-gray-500'}`}>
            {validation?.strength || 'Enter password'}
          </span>
          {checkingBreach && (
            <span className="flex items-center gap-1 text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking security...
            </span>
          )}
        </div>
      </div>

      {/* Breach Warning */}
      {breachResult?.breached && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700">
            <strong>Security Warning:</strong> This password has been exposed in{' '}
            {breachResult.count.toLocaleString()} data breach
            {breachResult.count > 1 ? 'es' : ''}. Please choose a different password.
          </div>
        </div>
      )}

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs ${
                req.met ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {req.met ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              {req.label}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {validation?.suggestions?.length > 0 && validation.valid && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Tip:</span> {validation.suggestions[0]}
        </div>
      )}
    </div>
  );
}
