/**
 * Top Toolbar - OptiSigns Exact Copy
 *
 * Contextual toolbar that matches OptiSigns exactly.
 * Features:
 * - Font selector with "Used in design" section
 * - Font size with -/+ buttons
 * - Color picker with "Used in design" colors
 * - Bold/Italic/Underline/Strikethrough
 * - Text Case (Aa) dropdown
 * - Text Alignment dropdown
 * - Letter/Line spacing dropdown
 * - Link, Settings icons
 * - Effects, Animate, Position buttons (open left panels)
 * - Lock icons
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Settings,
  Sparkles,
  Play,
  Move,
  Lock,
  Unlock,
  FlipHorizontal,
  FlipVertical,
  X,
  Type,
  Image as ImageIcon,
  Grid3x3,
  Crop,
  Copy,
  RefreshCw,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';

// Default Google Fonts
const DEFAULT_FONTS = [
  'Roboto', 'Open Sans', 'Noto Sans JP', 'Inter', 'Montserrat', 'Poppins',
  'Lato', 'Roboto Condensed', 'Arimo', 'Roboto Mono', 'Oswald', 'Noto Sans',
  'Raleway', 'Nunito Sans', 'Noto Sans KR', 'Nunito', 'Playfair Display',
  'Rubik', 'Ubuntu', 'DM Sans', 'Roboto Slab', 'Merriweather', 'Work Sans',
  'Kanit', 'PT Sans', 'Noto Sans SC', 'Parisienne', 'Dancing Script', 'Great Vibes',
];

// Color presets matching OptiSigns
const COLOR_PRESETS = [
  // Row 1 - Bright
  '#FF0000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF69B4', '#00CED1', '#FF1493',
  // Row 2 - Vivid
  '#7CFC00', '#FFD700', '#FF8C00', '#DC143C', '#8A2BE2', '#00FF7F', '#FF4500', '#1E90FF', '#ADFF2F', '#FF6347',
  // Row 3 - Pastels
  '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#E6E6FA', '#FFDAB9', '#B0E0E6', '#FFFACD', '#D8BFD8',
  // Row 4 - Neutrals
  '#E98813', '#4169E1', '#9370DB', '#20B2AA', '#000000', '#FFFFFF', '#808080', '#C0C0C0', '#A9A9A9', '#D3D3D3',
];

export default function TopToolbar({
  selectedObject,
  onUpdate,
  onToggleLock,
  onDuplicate,
  onDelete,
  isLocked,
  fonts = DEFAULT_FONTS,
  colorPresets = COLOR_PRESETS,
  usedColors = [],
  usedFonts = [],
  activePanel,
  onPanelChange,
}) {
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showSpacingDropdown, setShowSpacingDropdown] = useState(false);
  const [fontSearch, setFontSearch] = useState('');

  const fontDropdownRef = useRef(null);
  const colorPickerRef = useRef(null);
  const caseDropdownRef = useRef(null);
  const alignDropdownRef = useRef(null);
  const spacingDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target)) setShowFontDropdown(false);
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false);
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target)) setShowCaseDropdown(false);
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(e.target)) setShowAlignDropdown(false);
      if (spacingDropdownRef.current && !spacingDropdownRef.current.contains(e.target)) setShowSpacingDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isText = selectedObject?.type === 'i-text' || selectedObject?.type === 'text' || selectedObject?.type === 'textbox';
  const isImage = selectedObject?.type === 'image';

  // Filter fonts based on search
  const filteredFonts = fonts.filter(font =>
    font.toLowerCase().includes(fontSearch.toLowerCase())
  );

  // Font size handlers
  const handleFontSizeChange = (delta) => {
    const currentSize = selectedObject?.fontSize || 16;
    const newSize = Math.max(8, Math.min(800, currentSize + delta));
    onUpdate?.('fontSize', newSize);
  };

  // Text case handler
  const handleTextCase = (caseType) => {
    if (!selectedObject?.text) return;
    let newText = selectedObject.text;
    switch (caseType) {
      case 'uppercase':
        newText = selectedObject.text.toUpperCase();
        break;
      case 'lowercase':
        newText = selectedObject.text.toLowerCase();
        break;
      case 'sentence':
        newText = selectedObject.text.charAt(0).toUpperCase() + selectedObject.text.slice(1).toLowerCase();
        break;
      case 'title':
        newText = selectedObject.text.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
    }
    onUpdate?.('text', newText);
    setShowCaseDropdown(false);
  };

  // Small button style
  const SmallButton = ({ icon: Icon, active, onClick, title, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        disabled ? 'text-gray-600 cursor-not-allowed' :
        active ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  // Divider
  const Divider = () => <div className="w-px h-6 bg-gray-700 mx-1" />;

  if (!selectedObject) {
    return (
      <div className="h-11 bg-gray-800 border-b border-gray-700 flex items-center px-3">
        <span className="text-sm text-gray-500">Select an object to edit</span>
      </div>
    );
  }

  return (
    <div className="h-11 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-1">
      {/* TEXT CONTROLS */}
      {isText && (
        <>
          {/* Font Family Dropdown */}
          <div className="relative" ref={fontDropdownRef}>
            <button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm min-w-[100px] max-w-[140px]"
            >
              <span className="truncate text-xs" style={{ fontFamily: selectedObject.fontFamily || 'Roboto' }}>
                {selectedObject.fontFamily || 'Roboto'}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {showFontDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-gray-700">
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="overflow-y-auto max-h-80">
                  {/* Used in this design */}
                  {usedFonts.length > 0 && (
                    <div className="p-2 border-b border-gray-700">
                      <span className="text-xs text-gray-400 mb-2 block">Used in this design</span>
                      {usedFonts.map(font => (
                        <button
                          key={`used-${font}`}
                          onClick={() => { onUpdate?.('fontFamily', font); setShowFontDropdown(false); }}
                          className={`w-full px-2 py-1.5 text-left text-sm hover:bg-gray-700 rounded flex items-center justify-between ${
                            selectedObject.fontFamily === font ? 'text-green-400' : 'text-white'
                          }`}
                          style={{ fontFamily: font }}
                        >
                          <span>{font}</span>
                          {selectedObject.fontFamily === font && <span className="text-green-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* All Fonts */}
                  <div className="p-2">
                    <span className="text-xs text-gray-400 mb-2 block">All Fonts</span>
                    {filteredFonts.map(font => (
                      <button
                        key={font}
                        onClick={() => { onUpdate?.('fontFamily', font); setShowFontDropdown(false); }}
                        className={`w-full px-2 py-1.5 text-left text-sm hover:bg-gray-700 rounded flex items-center gap-2 ${
                          selectedObject.fontFamily === font ? 'text-green-400' : 'text-white'
                        }`}
                        style={{ fontFamily: font }}
                      >
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                        <span>{font}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Font Size */}
          <div className="flex items-center">
            <button
              onClick={() => handleFontSizeChange(-2)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={Math.round(selectedObject.fontSize || 16)}
              onChange={(e) => onUpdate?.('fontSize', parseInt(e.target.value) || 16)}
              className="w-12 bg-gray-700 text-white text-center text-sm py-0.5 rounded border border-gray-600 focus:outline-none focus:border-green-500 mx-0.5"
            />
            <button
              onClick={() => handleFontSizeChange(2)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <Divider />

          {/* Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 p-1 hover:bg-gray-700 rounded"
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-gray-500"
                style={{ backgroundColor: selectedObject.fill || '#333333' }}
              />
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-72">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">Colors</span>
                  <button onClick={() => setShowColorPicker(false)} className="p-1 text-gray-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                {/* Used in this design */}
                {usedColors.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-400 mb-2 block">Used in this design</span>
                    <div className="flex flex-wrap gap-1">
                      {usedColors.map((color, i) => (
                        <button
                          key={`used-${i}`}
                          onClick={() => onUpdate?.('fill', color)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                            selectedObject.fill === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Grid */}
                <div className="mb-3">
                  <span className="text-xs text-gray-400 mb-2 block">Colors</span>
                  <div className="grid grid-cols-10 gap-1">
                    {colorPresets.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdate?.('fill', color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          selectedObject.fill === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Color */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedObject.fill || '#333333'}
                    onChange={(e) => onUpdate?.('fill', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedObject.fill || '#333333'}
                    onChange={(e) => onUpdate?.('fill', e.target.value)}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Bold/Italic/Underline/Strikethrough */}
          <SmallButton
            icon={Bold}
            active={selectedObject.fontWeight === 'bold'}
            onClick={() => onUpdate?.('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
            title="Bold"
          />
          <SmallButton
            icon={Italic}
            active={selectedObject.fontStyle === 'italic'}
            onClick={() => onUpdate?.('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
            title="Italic"
          />
          <SmallButton
            icon={Underline}
            active={selectedObject.underline}
            onClick={() => onUpdate?.('underline', !selectedObject.underline)}
            title="Underline"
          />
          <SmallButton
            icon={Strikethrough}
            active={selectedObject.linethrough}
            onClick={() => onUpdate?.('linethrough', !selectedObject.linethrough)}
            title="Strikethrough"
          />

          <Divider />

          {/* Text Case (Aa) */}
          <div className="relative" ref={caseDropdownRef}>
            <button
              onClick={() => setShowCaseDropdown(!showCaseDropdown)}
              className="flex items-center gap-0.5 px-1.5 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-sm"
              title="Text Case"
            >
              <span className="font-semibold">Aa</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showCaseDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                <button onClick={() => handleTextCase('uppercase')} className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-gray-700">UPPERCASE</button>
                <button onClick={() => handleTextCase('lowercase')} className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-gray-700">lowercase</button>
                <button onClick={() => handleTextCase('sentence')} className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-gray-700">Sentence case</button>
                <button onClick={() => handleTextCase('title')} className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-gray-700">Title Case</button>
              </div>
            )}
          </div>

          {/* Text Alignment */}
          <div className="relative" ref={alignDropdownRef}>
            <button
              onClick={() => setShowAlignDropdown(!showAlignDropdown)}
              className="flex items-center gap-0.5 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Alignment"
            >
              {selectedObject.textAlign === 'center' ? <AlignCenter className="w-4 h-4" /> :
               selectedObject.textAlign === 'right' ? <AlignRight className="w-4 h-4" /> :
               selectedObject.textAlign === 'justify' ? <AlignJustify className="w-4 h-4" /> :
               <AlignLeft className="w-4 h-4" />}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showAlignDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-2 flex gap-1">
                <button onClick={() => { onUpdate?.('textAlign', 'left'); setShowAlignDropdown(false); }} className={`p-2 rounded ${selectedObject.textAlign === 'left' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignLeft className="w-4 h-4" /></button>
                <button onClick={() => { onUpdate?.('textAlign', 'center'); setShowAlignDropdown(false); }} className={`p-2 rounded ${selectedObject.textAlign === 'center' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => { onUpdate?.('textAlign', 'right'); setShowAlignDropdown(false); }} className={`p-2 rounded ${selectedObject.textAlign === 'right' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignRight className="w-4 h-4" /></button>
                <button onClick={() => { onUpdate?.('textAlign', 'justify'); setShowAlignDropdown(false); }} className={`p-2 rounded ${selectedObject.textAlign === 'justify' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}><AlignJustify className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {/* Letter/Line Spacing */}
          <div className="relative" ref={spacingDropdownRef}>
            <button
              onClick={() => setShowSpacingDropdown(!showSpacingDropdown)}
              className="flex items-center gap-0.5 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Spacing"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="16" y2="18" />
              </svg>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSpacingDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-3 w-56">
                {/* Letter Spacing */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Letter Spacing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">-200</span>
                    <input
                      type="range"
                      min="-200"
                      max="800"
                      value={selectedObject.charSpacing || 0}
                      onChange={(e) => onUpdate?.('charSpacing', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500">800</span>
                  </div>
                  <div className="text-center text-xs text-white mt-1">{selectedObject.charSpacing || 0}</div>
                </div>

                {/* Line Height */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Line Height</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">0.5</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={selectedObject.lineHeight || 1}
                      onChange={(e) => onUpdate?.('lineHeight', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500">2.5</span>
                  </div>
                  <div className="text-center text-xs text-white mt-1">{(selectedObject.lineHeight || 1).toFixed(1)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Link */}
          <SmallButton icon={Link2} title="Link" onClick={() => {}} />

          {/* Settings */}
          <SmallButton icon={Settings} title="Settings" onClick={() => {}} />
        </>
      )}

      {/* IMAGE CONTROLS */}
      {isImage && (
        <>
          {/* Filters */}
          <button
            onClick={() => onPanelChange?.(activePanel === 'filters' ? null : 'filters')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
              activePanel === 'filters' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <Divider />

          {/* Position/Grid */}
          <SmallButton icon={Grid3x3} title="Position" onClick={() => {}} />

          {/* Crop */}
          <SmallButton icon={Crop} title="Crop" onClick={() => {}} />

          {/* Clone/Duplicate */}
          <SmallButton icon={Copy} title="Duplicate" onClick={onDuplicate} />

          {/* Swap/Replace */}
          <SmallButton icon={RefreshCw} title="Replace Image" onClick={() => {}} />

          {/* Link */}
          <SmallButton icon={Link2} title="Link" onClick={() => {}} />

          {/* Settings */}
          <SmallButton icon={Settings} title="Settings" onClick={() => {}} />
        </>
      )}

      {/* SHAPE CONTROLS */}
      {!isText && !isImage && (
        <>
          {/* Fill/Stroke Color */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700 rounded"
              title="Fill Color"
            >
              <div
                className="w-5 h-5 rounded border border-gray-500"
                style={{ backgroundColor: selectedObject.fill || 'transparent' }}
              />
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-72">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">Fill & Stroke</span>
                  <button onClick={() => setShowColorPicker(false)} className="p-1 text-gray-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                {/* Fill Color Grid */}
                <div className="mb-3">
                  <span className="text-xs text-gray-400 mb-2 block">Fill</span>
                  <div className="grid grid-cols-10 gap-1 mb-2">
                    {colorPresets.slice(0, 20).map((color, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdate?.('fill', color)}
                        className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                          selectedObject.fill === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Stroke */}
                <div className="pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-400 mb-2 block">Stroke</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedObject.stroke || '#333333'}
                      onChange={(e) => onUpdate?.('stroke', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="number"
                      value={selectedObject.strokeWidth || 0}
                      onChange={(e) => onUpdate?.('strokeWidth', parseInt(e.target.value) || 0)}
                      min={0}
                      max={50}
                      className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                      placeholder="Width"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Flip */}
          <SmallButton icon={FlipHorizontal} title="Flip Horizontal" onClick={() => onUpdate?.('flipX', !selectedObject.flipX)} />
          <SmallButton icon={FlipVertical} title="Flip Vertical" onClick={() => onUpdate?.('flipY', !selectedObject.flipY)} />
        </>
      )}

      <Divider />

      {/* More Options Menu */}
      <SmallButton icon={MoreHorizontal} title="More Options" onClick={() => {}} />

      <Divider />

      {/* Duplicate & Delete */}
      <SmallButton icon={Copy} title="Duplicate" onClick={onDuplicate} />
      <SmallButton icon={Trash2} title="Delete" onClick={onDelete} />

      <Divider />

      {/* COMMON CONTROLS - Effects, Animate, Position */}
      <button
        onClick={() => onPanelChange?.(activePanel === 'effects' ? null : 'effects')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          activePanel === 'effects' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>Effects</span>
      </button>

      <button
        onClick={() => onPanelChange?.(activePanel === 'animate' ? null : 'animate')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          activePanel === 'animate' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Play className="w-4 h-4" />
        <span>Animate</span>
      </button>

      <button
        onClick={() => onPanelChange?.(activePanel === 'position' ? null : 'position')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          activePanel === 'position' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
      >
        <Move className="w-4 h-4" />
        <span>Position</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Lock icons */}
      <SmallButton
        icon={isLocked ? Lock : Unlock}
        active={isLocked}
        onClick={onToggleLock}
        title={isLocked ? 'Unlock' : 'Lock'}
      />
      <SmallButton
        icon={Lock}
        title="Lock Aspect Ratio"
        onClick={() => {}}
      />
    </div>
  );
}
