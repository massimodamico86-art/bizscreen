// src/player/components/index.js
// Barrel export for player components

// Renderer components (extracted from Player.jsx)
export { SceneRenderer } from './SceneRenderer.jsx';
export { LayoutRenderer } from './LayoutRenderer.jsx';
export { ZonePlayer } from './ZonePlayer.jsx';
export { AppRenderer } from './AppRenderer.jsx';

// Page components
export { PairPage } from './PairPage.jsx';
export { PairingScreen } from './PairingScreen.jsx';
export { PinEntry } from './PinEntry.jsx';

// Re-export widgets from widgets subdirectory
export { ClockWidget, DateWidget, WeatherWidget, QRCodeWidget } from './widgets';
