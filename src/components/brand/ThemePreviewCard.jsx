/**
 * ThemePreviewCard
 *
 * Displays a preview of a brand theme including:
 * - Color palette swatches
 * - Font samples
 * - Button/UI element previews
 * - Background preview
 */


export default function ThemePreviewCard({
  theme,
  compact = false,
  className = '',
  onClick,
  selected = false,
}) {
  if (!theme) return null;

  const {
    primary_color = '#3B82F6',
    secondary_color = '#1D4ED8',
    accent_color = '#10B981',
    neutral_color = '#6B7280',
    background_color = '#0F172A',
    text_primary_color = '#FFFFFF',
    text_secondary_color = '#94A3B8',
    font_heading = 'Inter',
    font_body = 'Inter',
    name = 'Brand Theme',
  } = theme;

  if (compact) {
    return (
      <button
        className={`
          w-full p-3 rounded-lg border transition-all text-left
          ${selected
            ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5'
            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
          }
          ${className}
        `}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {/* Mini color swatches */}
          <div className="flex -space-x-1">
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-900"
              style={{ backgroundColor: primary_color }}
            />
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-900"
              style={{ backgroundColor: secondary_color }}
            />
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-900"
              style={{ backgroundColor: accent_color }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{name}</div>
            <div className="text-xs text-gray-500">{font_heading}</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all
        ${selected
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-gray-700 hover:border-gray-600'
        }
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Preview Area */}
      <div
        className="aspect-video relative p-4"
        style={{ backgroundColor: background_color }}
      >
        {/* Sample heading */}
        <div
          className="text-lg font-bold mb-1"
          style={{
            color: text_primary_color,
            fontFamily: font_heading,
          }}
        >
          Heading Text
        </div>

        {/* Sample body text */}
        <div
          className="text-sm mb-3"
          style={{
            color: text_secondary_color,
            fontFamily: font_body,
          }}
        >
          Body text sample with your brand fonts
        </div>

        {/* Sample button */}
        <div
          className="inline-block px-4 py-1.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: primary_color,
            color: text_primary_color,
          }}
        >
          Button
        </div>

        {/* Sample accent element */}
        <div
          className="absolute bottom-4 right-4 w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: accent_color }}
        >
          <Clock className="w-6 h-6" style={{ color: text_primary_color }} />
        </div>
      </div>

      {/* Color Palette */}
      <div className="p-4 bg-gray-800/50 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2 font-medium">Color Palette</div>
        <div className="flex gap-2">
          <ColorSwatch color={primary_color} label="Primary" />
          <ColorSwatch color={secondary_color} label="Secondary" />
          <ColorSwatch color={accent_color} label="Accent" />
          <ColorSwatch color={neutral_color} label="Neutral" />
        </div>

        {/* Font Info */}
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Type className="w-3 h-3" />
            <span>{font_heading}</span>
          </div>
          {font_body !== font_heading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Type className="w-3 h-3" />
              <span>{font_body}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual color swatch component
 */
function ColorSwatch({ color, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-8 h-8 rounded-lg border border-gray-600 shadow-sm"
        style={{ backgroundColor: color }}
        title={`${label}: ${color}`}
      />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

/**
 * Larger theme preview for full display
 */
export function ThemePreviewLarge({ theme }) {
  if (!theme) return null;

  const {
    primary_color = '#3B82F6',
    secondary_color = '#1D4ED8',
    accent_color = '#10B981',
    neutral_color = '#6B7280',
    background_color = '#0F172A',
    text_primary_color = '#FFFFFF',
    text_secondary_color = '#94A3B8',
    font_heading = 'Inter',
    font_body = 'Inter',
  } = theme;

  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden">
      {/* Large Preview Area */}
      <div
        className="aspect-video relative p-8"
        style={{ backgroundColor: background_color }}
      >
        {/* Sample layout similar to a scene */}
        <div className="h-full flex flex-col justify-center items-center">
          {/* Heading */}
          <h2
            className="text-4xl font-bold mb-2"
            style={{
              color: text_primary_color,
              fontFamily: font_heading,
            }}
          >
            Welcome to Your Brand
          </h2>

          {/* Subheading */}
          <p
            className="text-xl mb-6"
            style={{
              color: text_secondary_color,
              fontFamily: font_body,
            }}
          >
            This is how your content will look
          </p>

          {/* Sample cards */}
          <div className="flex gap-4">
            <div
              className="px-6 py-3 rounded-xl"
              style={{ backgroundColor: primary_color }}
            >
              <span
                className="font-semibold"
                style={{ color: text_primary_color }}
              >
                Primary Card
              </span>
            </div>
            <div
              className="px-6 py-3 rounded-xl"
              style={{ backgroundColor: accent_color }}
            >
              <span
                className="font-semibold"
                style={{ color: text_primary_color }}
              >
                Accent Card
              </span>
            </div>
          </div>
        </div>

        {/* Clock widget preview */}
        <div
          className="absolute bottom-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2"
          style={{
            backgroundColor: `${neutral_color}33`,
          }}
        >
          <Clock
            className="w-5 h-5"
            style={{ color: accent_color }}
          />
          <span
            className="text-lg font-medium"
            style={{
              color: text_primary_color,
              fontFamily: font_body,
            }}
          >
            10:30 AM
          </span>
        </div>
      </div>

      {/* Color Palette Bar */}
      <div className="flex">
        <div className="flex-1 h-3" style={{ backgroundColor: primary_color }} />
        <div className="flex-1 h-3" style={{ backgroundColor: secondary_color }} />
        <div className="flex-1 h-3" style={{ backgroundColor: accent_color }} />
        <div className="flex-1 h-3" style={{ backgroundColor: neutral_color }} />
        <div className="flex-1 h-3" style={{ backgroundColor: background_color }} />
      </div>
    </div>
  );
}

/**
 * Color palette grid display
 */
export function ColorPaletteGrid({ colors = [], onColorClick }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color, index) => (
        <button
          key={`${color}-${index}`}
          className="aspect-square rounded-lg border border-gray-600 hover:scale-105 transition-transform hover:border-white"
          style={{ backgroundColor: color }}
          onClick={() => onColorClick?.(color)}
          title={color}
        />
      ))}
    </div>
  );
}

/**
 * Font pairing preview
 */
export function FontPairingPreview({ heading, body, style, selected, onClick }) {
  return (
    <button
      className={`
        w-full p-4 rounded-lg border text-left transition-all
        ${selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
        }
      `}
      onClick={onClick}
    >
      <div
        className="text-lg font-bold text-white mb-1"
        style={{ fontFamily: heading }}
      >
        {heading}
      </div>
      <div
        className="text-sm text-gray-400 mb-2"
        style={{ fontFamily: body }}
      >
        {body}
      </div>
      <div className="text-xs text-gray-500">{style}</div>
    </button>
  );
}
