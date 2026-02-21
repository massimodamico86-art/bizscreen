/**
 * Hyperlink Modal - SVG Editor
 *
 * Modal dialog for adding, editing, and removing hyperlinks on selected fabric objects.
 * Supports URL validation (http/https), open-in-new-tab toggle, and remove link action.
 */

import { useState, useEffect, useRef } from 'react';
import { Link2, ExternalLink, X, Trash2 } from 'lucide-react';

export default function HyperlinkModal({ isOpen, onClose, currentUrl, onSave, onRemove }) {
  const [url, setUrl] = useState(currentUrl || '');
  const [error, setError] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const inputRef = useRef(null);

  // Sync URL when modal opens or currentUrl changes
  useEffect(() => {
    setUrl(currentUrl || '');
    setError('');
  }, [currentUrl, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const validateUrl = (value) => {
    if (!value.trim()) {
      return 'URL is required';
    }
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'URL must start with http:// or https://';
    }
    return '';
  };

  const handleSave = () => {
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSave(url);
  };

  const handleRemove = () => {
    setError('');
    onRemove();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-[420px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-medium text-sm">Hyperlink</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">URL</label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyPress}
              placeholder="https://example.com"
              className={`w-full px-3 py-2 bg-gray-700 text-white text-sm rounded-lg border ${
                error ? 'border-red-500' : 'border-gray-600 focus:border-green-500'
              } focus:outline-none transition-colors`}
            />
            {error && (
              <p className="mt-1 text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Open in new tab toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <ExternalLink className="w-4 h-4" />
              <span>Open in new tab</span>
            </div>
            <button
              onClick={() => setOpenInNewTab(!openInNewTab)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                openInNewTab ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  openInNewTab ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <div>
            {currentUrl && (
              <button
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Link
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
