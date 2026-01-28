/**
 * Canvas Controls
 *
 * Right-side floating controls for the canvas.
 * Features:
 * - Zoom in/out
 * - Zoom percentage display
 * - Layers toggle
 * - History (undo/redo)
 * - Pan/grab mode
 */




export default function CanvasControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleLayers,
  showLayers,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isPanMode,
  onTogglePan,
}) {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Zoom In"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={onZoomReset}
          className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-colors border-t border-b border-gray-700 text-sm font-medium"
          title="Reset Zoom"
        >
          {zoomPercentage}%
        </button>

        <button
          onClick={onZoomOut}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Layers toggle */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        <button
          onClick={onToggleLayers}
          className={`w-10 h-10 flex items-center justify-center transition-colors ${
            showLayers
              ? 'bg-orange-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title="Layers Panel"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* History controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`w-10 h-10 flex items-center justify-center transition-colors ${
            canUndo
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`w-10 h-10 flex items-center justify-center transition-colors border-t border-gray-700 ${
            canRedo
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      {/* Pan mode */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        <button
          onClick={onTogglePan}
          className={`w-10 h-10 flex items-center justify-center transition-colors ${
            isPanMode
              ? 'bg-orange-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={isPanMode ? 'Select Mode' : 'Pan Mode'}
        >
          {isPanMode ? <Hand className="w-5 h-5" /> : <MousePointer className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
