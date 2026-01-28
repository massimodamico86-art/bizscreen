/**
 * Polotno Editor Entry Point
 *
 * This is the main entry point for the standalone Polotno editor.
 * It reads URL parameters and initializes the editor.
 */

import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { DEFAULT_SECTIONS } from 'polotno/side-panel';
import { observer } from 'mobx-react-lite';

// Import Polotno's bundled Blueprint CSS
import 'polotno/blueprint.polotno.css';

// Communication with parent window
function sendToParent(type, data) {
  window.parent.postMessage({ source: 'polotno-editor', type, data }, '*');
}

// Global templates store (will be populated from parent)
let globalTemplates = [];
let templatesUpdateCallback = null;

// Custom Templates Section for the side panel
const TemplatesPanel = observer(({ store }) => {
  const [templates, setTemplates] = useState(globalTemplates);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Register callback to receive templates updates
    templatesUpdateCallback = (newTemplates) => {
      setTemplates(newTemplates);
      setLoading(false);
    };

    // Request templates from parent
    sendToParent('requestTemplates', {});

    // If no templates received after 2 seconds, show empty state
    const timeout = setTimeout(() => setLoading(false), 2000);

    return () => {
      clearTimeout(timeout);
      templatesUpdateCallback = null;
    };
  }, []);

  const handleTemplateClick = async (template) => {
    // Check if template has Polotno JSON data - use loadJSON for full template support
    if (template.data && template.data.pages && template.data.pages.length > 0) {
      try {
        // Use Polotno's native loadJSON for proper template loading
        // This handles fonts, elements, and all properties correctly
        await store.loadJSON(template.data);
        console.log('Template loaded successfully with', store.pages[0]?.children?.length || 0, 'elements');
      } catch (err) {
        console.error('Failed to load template JSON:', err);
        // Fallback: add thumbnail as image
        const page = store.activePage || store.pages[0];
        if (page) {
          const elementsToRemove = [...page.children];
          elementsToRemove.forEach(el => el.remove());
          page.addElement({
            type: 'image',
            src: template.thumbnail_url || template.preview_image_url || template.thumbnail,
            x: 0,
            y: 0,
            width: store.width,
            height: store.height,
            locked: false,
            name: template.name || 'Template',
          });
        }
      }
    } else {
      // No Polotno data - add template image as full-size background
      const page = store.activePage || store.pages[0];
      if (page) {
        const elementsToRemove = [...page.children];
        elementsToRemove.forEach(el => el.remove());
        page.addElement({
          type: 'image',
          src: template.thumbnail_url || template.preview_image_url || template.thumbnail,
          x: 0,
          y: 0,
          width: store.width,
          height: store.height,
          locked: false,
          name: template.name || 'Template',
        });
      }
    }
  };

  const filteredTemplates = templates.filter(t =>
    !searchQuery || (t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          marginBottom: '10px',
          border: '1px solid #394b59',
          borderRadius: '4px',
          background: '#30404d',
          color: '#fff',
          fontSize: '14px',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8a9ba8' }}>
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8a9ba8' }}>
          {searchQuery ? 'No templates found' : 'No templates available'}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          overflowY: 'auto',
          flex: 1,
          alignContent: 'flex-start',
        }}>
          {filteredTemplates.map((template, index) => (
            <div
              key={template.id || index}
              onClick={() => handleTemplateClick(template)}
              style={{
                cursor: 'pointer',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '2px solid transparent',
                transition: 'border-color 0.2s',
                width: 'calc(50% - 4px)',
                height: '80px',
                background: '#394b59',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f97316'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <img
                src={template.thumbnail_url || template.preview_image_url || template.thumbnail}
                alt={template.name || 'Template'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// Custom section definition
const TemplatesSection = {
  name: 'templates',
  Tab: (props) => (
    <SectionTab name="Templates" {...props}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/>
      </svg>
    </SectionTab>
  ),
  Panel: TemplatesPanel,
};

// Custom sections array (Templates first, then default sections minus Photos)
const CUSTOM_SECTIONS = [
  TemplatesSection,
  // Filter out Photos section and add the rest of DEFAULT_SECTIONS
  ...DEFAULT_SECTIONS.filter(section => section.name !== 'photos'),
];

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
          <SidePanel store={store} sections={CUSTOM_SECTIONS} defaultSection="templates" />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} />
          <Workspace store={store} />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}

// App component that handles initialization
function App() {
  const [store, setStore] = useState(null);
  const [error, setError] = useState(null);

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const width = parseInt(params.get('width')) || 1920;
  const height = parseInt(params.get('height')) || 1080;
  const designName = decodeURIComponent(params.get('name') || 'Untitled Design');

  useEffect(() => {
    try {
      // Create store with demo key
      const newStore = createStore({
        key: 'nFA5H9elEytDyPyvKL7T',
        showCredit: true,
      });

      newStore.setSize(width, height);
      if (newStore.pages.length === 0) {
        newStore.addPage();
      }

      // Listen for parent messages
      const handleMessage = async (event) => {
        if (event.data?.target !== 'polotno-editor') return;
        const { action, payload } = event.data;

        if (action === 'loadDesign' && payload?.json) {
          try {
            await newStore.loadJSON(payload.json);
            sendToParent('designLoaded', { success: true });
          } catch (err) {
            sendToParent('designLoaded', { success: false, error: err.message });
          }
        } else if (action === 'loadTemplate' && payload?.backgroundImage) {
          // Load template as a background image for customization
          try {
            // Update canvas size if provided in payload
            if (payload.width && payload.height) {
              newStore.setSize(payload.width, payload.height);
            }

            const page = newStore.activePage || newStore.pages[0];
            if (page) {
              // Add the template image as a full-size background image element
              page.addElement({
                type: 'image',
                src: payload.backgroundImage,
                x: 0,
                y: 0,
                width: newStore.width,
                height: newStore.height,
                locked: false, // Allow resizing/moving
                name: 'Template Background',
              });
              sendToParent('templateLoaded', {
                success: true,
                width: newStore.width,
                height: newStore.height
              });
            } else {
              sendToParent('templateLoaded', { success: false, error: 'No active page' });
            }
          } catch (err) {
            console.error('Template load error:', err);
            sendToParent('templateLoaded', { success: false, error: err.message });
          }
        } else if (action === 'exportImage') {
          try {
            const dataUrl = await newStore.toDataURL({ pixelRatio: 2 });
            const json = newStore.toJSON();
            sendToParent('imageExported', { success: true, dataUrl, json, width: newStore.width, height: newStore.height });
          } catch (err) {
            sendToParent('imageExported', { success: false, error: err.message });
          }
        } else if (action === 'setTemplates' && payload?.templates) {
          // Receive templates from parent
          globalTemplates = payload.templates;
          if (templatesUpdateCallback) {
            templatesUpdateCallback(payload.templates);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      setStore(newStore);

      // Notify parent we're ready
      sendToParent('ready', { width, height });

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    } catch (err) {
      console.error('Failed to initialize Polotno:', err);
      setError(err.message);
      sendToParent('error', { message: err.message });
    }
  }, [width, height]);

  if (error) {
    return (
      <div className="polotno-error">
        <div className="polotno-error-icon"><span>!</span></div>
        <h2>Failed to Load Editor</h2>
        <p>{error}</p>
        <button
          className="polotno-btn polotno-btn-secondary"
          onClick={() => sendToParent('close', {})}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="polotno-loading">
        <div className="polotno-spinner"></div>
        <p>Loading design editor...</p>
      </div>
    );
  }

  return (
    <Editor
      store={store}
      designName={designName}
      canvasWidth={width}
      canvasHeight={height}
    />
  );
}

// Mount the app
const root = createRoot(document.getElementById('app'));
root.render(<App />);
