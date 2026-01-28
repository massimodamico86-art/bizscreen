/**
 * Standalone Polotno Editor Bundle
 *
 * This file is bundled into a standalone IIFE that can be loaded via script tag.
 * It exposes window.initPolotnoEditor() for initialization.
 */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { DEFAULT_SECTIONS } from 'polotno/side-panel';

// Import Polotno styles
import 'polotno/blueprint.polotno.css';

// Communication with parent window
function sendToParent(type, data) {
  window.parent.postMessage({ source: 'polotno-editor', type, data }, '*');
}

// Top bar component
function TopBar({ store, designName, canvasWidth, canvasHeight }) {
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataUrl = await store.toDataURL({ pixelRatio: 2 });
      const json = store.toJSON();
      sendToParent('save', { dataUrl, json, width: store.width, height: store.height });
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const dataUrl = await store.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${designName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="polotno-top-bar">
      <div className="polotno-top-bar-left">
        <button
          className="polotno-close-btn"
          onClick={() => sendToParent('close', {})}
          title="Close"
        >
          ×
        </button>
        <span className="polotno-design-name">{designName}</span>
        <span className="polotno-design-size">{canvasWidth} × {canvasHeight}</span>
      </div>
      <div className="polotno-top-bar-right">
        <button
          className="polotno-btn polotno-btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export PNG'}
        </button>
        <button
          className="polotno-btn polotno-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save to Media'}
        </button>
      </div>
    </div>
  );
}

// Main editor component
function Editor({ store, designName, canvasWidth, canvasHeight }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        store={store}
        designName={designName}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
      <PolotnoContainer style={{ flex: 1, display: 'flex' }}>
        <SidePanelWrap>
          <SidePanel store={store} sections={DEFAULT_SECTIONS} />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} />
          <Workspace store={store} backgroundColor="#1a1a2e" />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}

// Initialize the editor
function initPolotnoEditor(options = {}) {
  const {
    container = '#app',
    width = 1920,
    height = 1080,
    designName = 'Untitled Design',
    apiKey = 'nFA5H9elEytDyPyvKL7T', // Demo key
  } = options;

  // Create store
  const store = createStore({
    key: apiKey,
    showCredit: true,
  });

  store.setSize(width, height);
  if (store.pages.length === 0) {
    store.addPage();
  }

  // Listen for parent messages
  window.addEventListener('message', async (event) => {
    if (event.data?.target !== 'polotno-editor') return;
    const { action, payload } = event.data;

    if (action === 'loadDesign' && payload?.json) {
      try {
        await store.loadJSON(payload.json);
        sendToParent('designLoaded', { success: true });
      } catch (err) {
        sendToParent('designLoaded', { success: false, error: err.message });
      }
    } else if (action === 'loadTemplate' && payload?.backgroundImage) {
      // Load template as a background image for customization
      try {
        const page = store.activePage || store.pages[0];
        if (page) {
          // Add the template image as a full-size background image element
          page.addElement({
            type: 'image',
            src: payload.backgroundImage,
            x: 0,
            y: 0,
            width: store.width,
            height: store.height,
            locked: false, // Allow resizing/moving
            name: 'Template Background',
          });
          sendToParent('templateLoaded', { success: true });
        } else {
          sendToParent('templateLoaded', { success: false, error: 'No active page' });
        }
      } catch (err) {
        console.error('Template load error:', err);
        sendToParent('templateLoaded', { success: false, error: err.message });
      }
    } else if (action === 'exportImage') {
      try {
        const dataUrl = await store.toDataURL({ pixelRatio: 2 });
        const json = store.toJSON();
        sendToParent('imageExported', { success: true, dataUrl, json, width: store.width, height: store.height });
      } catch (err) {
        sendToParent('imageExported', { success: false, error: err.message });
      }
    }
  });

  // Render
  const containerEl = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!containerEl) {
    throw new Error(`Container "${container}" not found`);
  }

  const root = createRoot(containerEl);
  root.render(
    <Editor
      store={store}
      designName={designName}
      canvasWidth={width}
      canvasHeight={height}
    />
  );

  // Notify parent we're ready
  sendToParent('ready', { width, height });

  return { store, root };
}

// Expose to window
window.initPolotnoEditor = initPolotnoEditor;

// Auto-init if URL params are present
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const autoInit = params.get('autoInit') !== 'false';

  if (autoInit && document.getElementById('app')) {
    const width = parseInt(params.get('width')) || 1920;
    const height = parseInt(params.get('height')) || 1080;
    const name = decodeURIComponent(params.get('name') || 'Untitled Design');

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initPolotnoEditor({ width, height, designName: name });
      });
    } else {
      initPolotnoEditor({ width, height, designName: name });
    }
  }
}
