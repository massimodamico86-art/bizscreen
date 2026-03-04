/**
 * DocumentWidgetControls
 *
 * Configuration UI for the document widget type in both the scene editor
 * and layout editor properties panels. Provides document picker with
 * conversion status, page interval selector, and loop toggle.
 */

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../../supabase';

/**
 * @param {Object} params
 * @param {Object} params.props - Widget props from the block
 * @param {Function} params.onPropChange - Callback to update a single prop (key, value)
 */
export function DocumentWidgetControls({ props, onPropChange }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Load available document-type media assets
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, name, config_json')
        .eq('type', 'document')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (!error && data) {
        setDocuments(data);
      }
      setLoading(false);
    }

    loadDocuments();

    return () => { cancelled = true; };
  }, []);

  // Find the selected document for status display
  const selectedDoc = documents.find((d) => d.id === props.mediaId);
  const selectedConfig = selectedDoc?.config_json || {};
  const conversionStatus = selectedConfig.conversionStatus || (
    selectedConfig.convertedPages?.length > 0 ? 'complete' : 'pending'
  );
  const pageCount = selectedConfig.convertedPages?.length || 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* Document Picker */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <FileText className="w-3 h-3 inline mr-1" />
          Document
        </label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.mediaId || ''}
          onChange={(e) => onPropChange('mediaId', e.target.value)}
        >
          <option value="">Select a document...</option>
          {documents.map((doc) => {
            const cfg = doc.config_json || {};
            const status = cfg.conversionStatus || (cfg.convertedPages?.length > 0 ? 'complete' : 'pending');
            const pages = cfg.convertedPages?.length || 0;
            const label = status === 'complete'
              ? `${doc.name} (${pages} page${pages !== 1 ? 's' : ''})`
              : `${doc.name} (converting...)`;
            return (
              <option key={doc.id} value={doc.id}>
                {label}
              </option>
            );
          })}
        </select>
        {!loading && documents.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Upload a document in the Media Library first
          </p>
        )}
      </div>

      {/* Conversion Status Indicator */}
      {props.mediaId && selectedDoc && (
        <div className="flex items-center gap-2 text-xs">
          {conversionStatus === 'pending' && (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <span className="text-yellow-400">Converting...</span>
            </>
          )}
          {conversionStatus === 'complete' && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="text-green-400">{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
            </>
          )}
          {conversionStatus === 'error' && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span className="text-red-400">Conversion failed</span>
            </>
          )}
        </div>
      )}

      {/* Page Interval Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Page Interval</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.pageIntervalSeconds || 10}
          onChange={(e) => onPropChange('pageIntervalSeconds', parseInt(e.target.value, 10))}
        >
          <option value={5}>5 seconds</option>
          <option value={10}>10 seconds</option>
          <option value={15}>15 seconds</option>
          <option value={30}>30 seconds</option>
          <option value={60}>60 seconds</option>
        </select>
      </div>

      {/* Loop Toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.loop !== false}
          onChange={(e) => onPropChange('loop', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Loop
      </label>
    </div>
  );
}
